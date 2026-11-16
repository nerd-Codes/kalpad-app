// tests/byok/notes_generator_v2.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ARCHETYPES,
  DEPTH_GUIDE,
  deriveDepthDirective,
  resolveArchetype,
  stripTimePrefix,
  normalizeNoteMarkdown,
  buildBlueprintPrompt,
  buildVisualAuthorPrompt,
  generateNoteBYOK,
  generateCustomNoteBYOK,
} from '../../src/lib/byok/pipelines/notesGenerator.js';

test('Notes Generator v2 - ARCHETYPES and DEPTH_GUIDE definitions are comprehensive', () => {
  assert.ok(ARCHETYPES.CONCEPT_MASTER);
  assert.ok(ARCHETYPES.DERIVATION_DEEP_DIVE);
  assert.ok(ARCHETYPES.PROBLEM_SOLVING);
  assert.ok(ARCHETYPES.VIVA_DRILL);
  assert.ok(ARCHETYPES.LAB_PROCEDURE);

  assert.ok(DEPTH_GUIDE.ESSENTIAL.targetWords.includes('800'));
  assert.ok(DEPTH_GUIDE.STANDARD.targetWords.includes('1,500'));
  assert.ok(DEPTH_GUIDE.COMPREHENSIVE.targetWords.includes('2,600'));
});

test('Notes Generator v2 - resolveArchetype maps Plan v2 types and text semantics accurately', () => {
  // Plan v2 types
  assert.equal(resolveArchetype({ subTopicType: 'Derivation' }), 'DERIVATION_DEEP_DIVE');
  assert.equal(resolveArchetype({ subTopicType: 'Practice' }), 'PROBLEM_SOLVING');
  assert.equal(resolveArchetype({ subTopicType: 'Viva_Drill' }), 'VIVA_DRILL');
  assert.equal(resolveArchetype({ subTopicType: 'Lab_Procedure' }), 'LAB_PROCEDURE');
  assert.equal(resolveArchetype({ subTopicType: 'Concept' }), 'CONCEPT_MASTER');

  // Text semantics
  assert.equal(
    resolveArchetype({ subTopicText: 'Derive expression for Compton wavelength shift' }),
    'DERIVATION_DEEP_DIVE'
  );
  assert.equal(
    resolveArchetype({ subTopicText: 'Solve numerical problems on Carnot efficiency' }),
    'PROBLEM_SOLVING'
  );
  assert.equal(
    resolveArchetype({ subTopicText: 'Viva questions and examiner cross-examination on Ohm law' }),
    'VIVA_DRILL'
  );
  assert.equal(
    resolveArchetype({ subTopicText: 'Apparatus setup and lab procedure for prism experiment' }),
    'LAB_PROCEDURE'
  );

  // Exam format fallback
  assert.equal(resolveArchetype({ examFormat: 'viva' }), 'VIVA_DRILL');
  assert.equal(resolveArchetype({ examFormat: 'practical' }), 'LAB_PROCEDURE');

  // Override
  assert.equal(
    resolveArchetype({ subTopicType: 'Concept', archetypeOverride: 'DERIVATION_DEEP_DIVE' }),
    'DERIVATION_DEEP_DIVE'
  );
});

test('Notes Generator v2 - deriveDepthDirective calibrates word budget based on time and difficulty', () => {
  // By allocated minutes
  assert.equal(deriveDepthDirective('', 20), 'ESSENTIAL');
  assert.equal(deriveDepthDirective('', 50), 'STANDARD');
  assert.equal(deriveDepthDirective('', 90), 'COMPREHENSIVE');

  // By raw text
  assert.equal(deriveDepthDirective('(25 min) Quick recall'), 'ESSENTIAL');
  assert.equal(deriveDepthDirective('(55 min) Regular chapter'), 'STANDARD');
  assert.equal(deriveDepthDirective('(2 hrs) Heavy derivation'), 'COMPREHENSIVE');

  // By difficulty
  assert.equal(deriveDepthDirective('', null, 'Intense'), 'COMPREHENSIVE');
  assert.equal(deriveDepthDirective('', null, 'Easy'), 'ESSENTIAL');
});

test('Notes Generator v2 - stripTimePrefix cleans topic text', () => {
  assert.equal(stripTimePrefix('(45 min) Understand First Law of Thermodynamics'), 'Understand First Law of Thermodynamics');
  assert.equal(stripTimePrefix('(1.5 hrs) Derivation of Wave Equation'), 'Derivation of Wave Equation');
  assert.equal(stripTimePrefix('Clean text without timer'), 'Clean text without timer');
});

test('Notes Generator v2 - normalizeNoteMarkdown repairs LaTeX spacing and auto-closes details tags', () => {
  const dirty = `
Some text
$$E = mc^2$$
More text with unclosed tag
<details>
<summary>Solution</summary>
Step 1: Calculate energy.
`;
  const normalized = normalizeNoteMarkdown(dirty);
  assert.ok(normalized.includes('$$'));
  assert.ok(normalized.includes('</details>'));
});

test('Notes Generator v2 - prompts enforce visual design system and anti-wall-of-text rules', () => {
  const blueprintPrompt = buildBlueprintPrompt({
    examName: 'JEE Advanced',
    academicLevel: 'High School Competitive',
    examFormat: 'Theory',
    dayTopic: 'Thermodynamics',
    cleanSubTopic: 'First Law of Thermodynamics & Enthalpy',
    archetype: 'DERIVATION_DEEP_DIVE',
    depthDirective: 'COMPREHENSIVE',
    previousContext: 'Zeroth Law & Heat Capacities',
    strategicContext: { high_yield_topics: ['Enthalpy of Reaction'] },
  });

  assert.ok(blueprintPrompt.includes('JEE Advanced'));
  assert.ok(blueprintPrompt.includes('DERIVATION_DEEP_DIVE'));
  assert.ok(blueprintPrompt.includes('mental_model_hook'));
  assert.ok(blueprintPrompt.includes('exam_traps'));
  assert.ok(blueprintPrompt.includes('active_recall_checkpoints'));

  const authorPrompt = buildVisualAuthorPrompt({
    examName: 'JEE Advanced',
    academicLevel: 'High School Competitive',
    examFormat: 'Theory',
    dayTopic: 'Thermodynamics',
    cleanSubTopic: 'First Law of Thermodynamics & Enthalpy',
    archetype: 'DERIVATION_DEEP_DIVE',
    depthDirective: 'COMPREHENSIVE',
    previousContext: 'Zeroth Law',
    blueprint: { mental_model_hook: 'Energy bookkeeping' },
  });

  assert.ok(authorPrompt.includes('Intuition & Mental Model'));
  assert.ok(authorPrompt.includes('Common Exam Trap'));
  assert.ok(authorPrompt.includes('30-Second Examiner Answer'));
  assert.ok(authorPrompt.includes('UNBREAKABLE KATEX MATH RULES'));
  assert.ok(authorPrompt.includes('<details>'));
  assert.ok(authorPrompt.includes('<summary>Reveal Step-by-Step Solution</summary>'));
});

test('Notes Generator v2 - generateNoteBYOK and generateCustomNoteBYOK throw BYOK_NOT_CONNECTED when unauthenticated', async () => {
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
});
