// tests/byok/notes_generator_v2.test.mjs
/**
 * Test Suite for KalPad Notes Generation Engine v1 (Proven 3-Stage Pipeline).
 * Verifies:
 * 1. stripTimePrefix strips all time annotations cleanly
 * 2. deriveDepthDirective maps study duration accurately to ESSENTIAL, STANDARD, and COMPREHENSIVE
 * 3. DEPTH_GUIDE establishes clear word targets (~700-1000, ~1200-2000, ~2500-3500)
 * 4. buildPersonaPrompt structures Stage 0 academic persona generation
 * 5. buildOutlinePrompt structures Stage 1 pedagogical outline with [MISCONCEPTION] and [EXAMPLE NEEDED]
 * 6. buildAuthorPrompt structures Stage 2 textbook authoring with unbreakable KaTeX and pedagogical elements
 * 7. generateNoteBYOK, generateCustomNoteBYOK, and bulkGenerateNotesBYOK enforce BYOK connection guardrails
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEPTH_GUIDE,
  deriveDepthDirective,
  stripTimePrefix,
  buildPersonaPrompt,
  buildOutlinePrompt,
  buildAuthorPrompt,
  generateNoteBYOK,
  generateCustomNoteBYOK,
  bulkGenerateNotesBYOK,
} from '../../src/lib/byok/pipelines/notesGenerator.js';

test('Notes Generator v1 - stripTimePrefix cleans timer annotations from subtopics', () => {
  assert.equal(stripTimePrefix('(45 min) Understand First Law of Thermodynamics'), 'Understand First Law of Thermodynamics');
  assert.equal(stripTimePrefix('(1.5 hrs) Derivation of Wave Equation'), 'Derivation of Wave Equation');
  assert.equal(stripTimePrefix('(2h) Quantum Superposition'), 'Quantum Superposition');
  assert.equal(stripTimePrefix('(30 mins) Review Bayes Rule'), 'Review Bayes Rule');
  assert.equal(stripTimePrefix('Clean text without timer'), 'Clean text without timer');
  assert.equal(stripTimePrefix(''), '');
});

test('Notes Generator v1 - deriveDepthDirective maps durations to pedagogical depth levels', () => {
  // < 0.75h (45 min threshold) -> ESSENTIAL
  assert.equal(deriveDepthDirective('(30 min) Quick recall'), 'ESSENTIAL');
  assert.equal(deriveDepthDirective('(40 min) Bayes derivation'), 'ESSENTIAL');
  assert.equal(deriveDepthDirective('(0.5h) Short summary'), 'ESSENTIAL');

  // >= 0.75h and < 1.25h -> STANDARD
  assert.equal(deriveDepthDirective('(45 min) Standard lecture'), 'STANDARD');
  assert.equal(deriveDepthDirective('(1h) Standard topic'), 'STANDARD');
  assert.equal(deriveDepthDirective('(60 mins) Core chapter'), 'STANDARD');

  // >= 1.25h -> COMPREHENSIVE
  assert.equal(deriveDepthDirective('(1.5 hrs) Heavy derivation'), 'COMPREHENSIVE');
  assert.equal(deriveDepthDirective('(2 hrs) Masterclass'), 'COMPREHENSIVE');
  assert.equal(deriveDepthDirective('(90 min) Extensive session'), 'COMPREHENSIVE');

  // Default fallback without time annotation -> STANDARD
  assert.equal(deriveDepthDirective('Subtopic without any time indicator'), 'STANDARD');
});

test('Notes Generator v1 - DEPTH_GUIDE specifies calibrated targets without overshooting', () => {
  assert.ok(DEPTH_GUIDE.ESSENTIAL.includes('ESSENTIAL'));
  assert.ok(DEPTH_GUIDE.ESSENTIAL.includes('700–1000 words'));

  assert.ok(DEPTH_GUIDE.STANDARD.includes('STANDARD'));
  assert.ok(DEPTH_GUIDE.STANDARD.includes('1200–2000 words'));

  assert.ok(DEPTH_GUIDE.COMPREHENSIVE.includes('COMPREHENSIVE'));
  assert.ok(DEPTH_GUIDE.COMPREHENSIVE.includes('2500–3500 words'));
});

test('Notes Generator v1 - buildPersonaPrompt generates structured Stage 0 prompt', () => {
  const prompt = buildPersonaPrompt('GATE Computer Science');
  assert.ok(prompt.includes('GATE Computer Science'));
  assert.ok(prompt.includes('audience_level'));
  assert.ok(prompt.includes('key_focus_areas'));
  assert.ok(prompt.includes('writing_style'));
});

test('Notes Generator v1 - buildOutlinePrompt enforces Stage 1 pedagogical outline requirements', () => {
  const outlinePrompt = buildOutlinePrompt({
    examName: 'UPSC Civil Services',
    dayTopic: 'Modern Indian History',
    cleanSubTopic: 'Revolt of 1857: Causes and Consequences',
    previousContext: 'Charter Acts of 1833 and 1853',
    examPersona: { audience_level: 'Civil Services Aspirant', writing_style: 'Analytical, authoritative' },
    depthDirective: 'STANDARD',
  });

  assert.ok(outlinePrompt.includes('UPSC Civil Services'));
  assert.ok(outlinePrompt.includes('Modern Indian History'));
  assert.ok(outlinePrompt.includes('Revolt of 1857'));
  assert.ok(outlinePrompt.includes('Charter Acts of 1833 and 1853'));
  assert.ok(outlinePrompt.includes('[MISCONCEPTION:'));
  assert.ok(outlinePrompt.includes('[EXAMPLE NEEDED:'));
  assert.ok(outlinePrompt.includes('### for sections'));
});

test('Notes Generator v1 - buildAuthorPrompt enforces Stage 2 textbook authoring rules and unbreakable KaTeX', () => {
  const authorPrompt = buildAuthorPrompt({
    examName: 'IIT JEE Advanced',
    dayTopic: 'Electrodynamics',
    cleanSubTopic: 'Gauss Law and Symmetrical Charge Distributions',
    previousContext: 'Electric Field and Flux',
    examPersona: { audience_level: 'Advanced engineering entrant', writing_style: 'Rigorous, derivation-first' },
    depthDirective: 'COMPREHENSIVE',
    chapterOutline: '### 1. Electric Flux Intuition\n### 2. Gauss Law Formulation\n### 3. Symmetrical Surfaces',
  });

  assert.ok(authorPrompt.includes('IIT JEE Advanced'));
  assert.ok(authorPrompt.includes('Gauss Law'));
  assert.ok(authorPrompt.includes('Common Misconception'));
  assert.ok(authorPrompt.includes('Definition:'));
  assert.ok(authorPrompt.includes('where'));
  assert.ok(authorPrompt.includes('WORKED EXAMPLES'));
  assert.ok(authorPrompt.includes('CHECK YOUR UNDERSTANDING'));
  assert.ok(authorPrompt.includes('CONNECTIONS'));
  assert.ok(authorPrompt.includes('LATEX (KATEX — UNBREAKABLE)'));
  assert.ok(authorPrompt.includes('Inline: $...$ only'));
  assert.ok(authorPrompt.includes('Display: $$...$$ only'));
});

test('Notes Generator v1 - generateNoteBYOK, generateCustomNoteBYOK, and bulkGenerateNotesBYOK throw BYOK_NOT_CONNECTED when unauthenticated', async () => {
  let noteErr = null;
  try {
    await generateNoteBYOK({ planTopicId: 10, subTopicText: 'Kinematics' });
  } catch (err) {
    noteErr = err;
  }
  assert.ok(noteErr);
  assert.equal(noteErr.code, 'BYOK_NOT_CONNECTED');

  let customErr = null;
  try {
    await generateCustomNoteBYOK({ topicText: 'Quantum Tunneling' });
  } catch (err) {
    customErr = err;
  }
  assert.ok(customErr);
  assert.equal(customErr.code, 'BYOK_NOT_CONNECTED');

  let bulkErr = null;
  try {
    await bulkGenerateNotesBYOK([{ plan_topic_id: 1, sub_topic_text: 'Thermodynamics' }]);
  } catch (err) {
    bulkErr = err;
  }
  assert.ok(bulkErr);
  assert.equal(bulkErr.code, 'BYOK_NOT_CONNECTED');
});
