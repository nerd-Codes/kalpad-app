// tests/byok/plan_generator_v2.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCurriculumExpansionPrompt,
  buildMasterCurriculumLedger,
  generatePlanBYOK_v2,
  KALPAD_CONSTITUTION_V2,
} from '../../src/lib/byok/pipelines/planGeneratorV2.js';

test('Plan Generator v2 - Constitution enforces grounded realism, iceberg expansion, and minute budgets', () => {
  assert.ok(KALPAD_CONSTITUTION_V2.includes('4-unit university syllabus'));
  assert.ok(KALPAD_CONSTITUTION_V2.includes('Unpack the Iceberg'));
  assert.ok(KALPAD_CONSTITUTION_V2.includes('Viva / Oral'));
  assert.ok(KALPAD_CONSTITUTION_V2.includes('Practical / Lab'));
  assert.ok(KALPAD_CONSTITUTION_V2.includes('Actionable Tasks with Exact Minute Budgets'));
});

test('Plan Generator v2 - buildCurriculumExpansionPrompt instructs auto-curriculum when syllabus is empty', () => {
  const prompt = buildCurriculumExpansionPrompt({
    examName: 'Class 12 Physics CBSE',
    syllabus: '',
    daysLeft: 3,
    studyHoursPerDay: 6,
    examFormat: 'viva',
    prepLevel: 'cram',
    priorityNote: 'Focus on Optics and Modern Physics',
  });

  assert.ok(prompt.includes('Class 12 Physics CBSE'));
  assert.ok(prompt.includes('populate full authentic standard curriculum'));
  assert.ok(prompt.includes('EXAM FORMAT: "viva"'));
  assert.ok(prompt.includes('PREPARATION BASELINE: "cram"'));
  assert.ok(prompt.includes('Focus on Optics and Modern Physics'));
  assert.ok(prompt.includes('COMPRESSED TIMELINE'));
});

test('Plan Generator v2 - buildMasterCurriculumLedger guarantees 100% topic scheduling under compressed 4 units in 2 days', () => {
  const mockManifest = {
    curriculum_analysis: {
      confidence_building_topic_ids: ['t1', 't4'],
      high_yield_topic_ids: ['t2', 't5', 't8', 't11'],
    },
    sections: [
      { section_id: 's1', section_name: 'Unit 1: Thermodynamics', exam_weight_pct: 25, suggested_phase: 'early', inter_section_dependencies: [] },
      { section_id: 's2', section_name: 'Unit 2: Kinetics', exam_weight_pct: 25, suggested_phase: 'early', inter_section_dependencies: ['s1'] },
      { section_id: 's3', section_name: 'Unit 3: Equilibrium', exam_weight_pct: 25, suggested_phase: 'mid', inter_section_dependencies: ['s2'] },
      { section_id: 's4', section_name: 'Unit 4: Coordination Compounds', exam_weight_pct: 25, suggested_phase: 'late', inter_section_dependencies: ['s3'] },
    ],
    topics: Array.from({ length: 12 }, (_, i) => ({
      topic_id: 't' + (i + 1),
      section_id: 's' + (Math.floor(i / 3) + 1),
      topic_name: 'Topic ' + (i + 1),
      time_budget_hours: 2.0,
      difficulty: 'Medium',
      exam_relevance: 'High',
      status: 'core',
      is_confidence_builder: i === 0 || i === 3,
      is_high_yield: i % 3 === 1,
      intra_dependencies: i > 0 && i % 3 !== 0 ? ['t' + i] : [],
      exam_angles: {
        must_know_concepts: ['Concept ' + (i + 1)],
        formulas_and_derivations: ['$W = -PdV$'],
      },
      triage_notes: 'Core topic',
    })),
  };

  const ledger = buildMasterCurriculumLedger({
    manifest: mockManifest,
    daysLeft: 2,
    studyHoursPerDay: 5,
    startDate: '2026-11-17',
    examFormat: 'theory',
  });

  assert.equal(ledger.length, 2);

  const scheduledTopicIds = new Set();
  ledger.forEach((day) => {
    assert.ok(day.allocated_hours >= 5, 'Dynamic flex hours allocated');
    day.topics.forEach((t) => scheduledTopicIds.add(t.topic_id));
  });

  // Zero topics dropped
  assert.equal(scheduledTopicIds.size, 12, 'All 12 topics across all 4 units scheduled');

  // Confidence builders on Day 1
  const day1Topics = ledger[0].topics.map((t) => t.topic_id);
  assert.ok(day1Topics.includes('t1'), 'Confidence builder t1 is scheduled on Day 1');
});

test('Plan Generator v2 - buildMasterCurriculumLedger provides dedicated review days on comfortable timelines', () => {
  const mockManifest = {
    curriculum_analysis: {
      confidence_building_topic_ids: ['t1'],
      high_yield_topic_ids: ['t2'],
    },
    sections: [
      { section_id: 's1', section_name: 'Unit 1', exam_weight_pct: 100, suggested_phase: 'early', inter_section_dependencies: [] },
    ],
    topics: [
      { topic_id: 't1', section_id: 's1', topic_name: 'Topic 1', time_budget_hours: 2.0, status: 'core', is_confidence_builder: true, exam_angles: {} },
      { topic_id: 't2', section_id: 's1', topic_name: 'Topic 2', time_budget_hours: 2.0, status: 'core', is_high_yield: true, exam_angles: {} },
    ],
  };

  const ledger = buildMasterCurriculumLedger({
    manifest: mockManifest,
    daysLeft: 5,
    studyHoursPerDay: 3,
    startDate: '2026-11-17',
    examFormat: 'theory',
  });

  assert.equal(ledger.length, 5);
  const reviewDays = ledger.filter((d) => d.is_review_only);
  assert.ok(reviewDays.length >= 2, 'Comfortable timeline inserts consolidation & recall review days');
});

test('Plan Generator v2 - generatePlanBYOK_v2 throws BYOK_NOT_CONNECTED when unauthenticated', async () => {
  await assert.rejects(
    () =>
      generatePlanBYOK_v2({
        examName: 'Sample Exam',
        syllabus: 'Unit 1: Test',
        examDate: '2026-12-01',
        studyHoursPerDay: 4,
      }),
    (err) => {
      assert.equal(err.code, 'BYOK_NOT_CONNECTED');
      return true;
    }
  );
});
