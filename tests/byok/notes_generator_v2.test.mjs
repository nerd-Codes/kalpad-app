// tests/byok/notes_generator_v2.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ARCHETYPES,
  DEPTH_GUIDE,
  deriveDepthDirective,
  resolveArchetype,
  stripTimePrefix,
  splitOutlineIntoSections,
  normalizeNoteMarkdown,
  buildOutlinePrompt,
  buildAuthorPrompt,
  generateNoteBYOK,
  generateCustomNoteBYOK,
} from '../../src/lib/byok/pipelines/notesGenerator.js';

test('Notes Generator v3 - ARCHETYPES and DEPTH_GUIDE definitions are comprehensive with word floors', () => {
  assert.ok(ARCHETYPES.CONCEPT_MASTER);
  assert.ok(ARCHETYPES.DERIVATION_DEEP_DIVE);
  assert.ok(ARCHETYPES.PROBLEM_SOLVING);
  assert.ok(ARCHETYPES.VIVA_DRILL);
  assert.ok(ARCHETYPES.LAB_PROCEDURE);

  // Minimum word floors (not ceilings)
  assert.ok(DEPTH_GUIDE.FOCUSED.minWords >= 1200);
  assert.ok(DEPTH_GUIDE.STANDARD.minWords >= 2500);
  assert.ok(DEPTH_GUIDE.DEEP.minWords >= 3500);
  assert.ok(DEPTH_GUIDE.EXHAUSTIVE.minWords >= 5000);

  // Backward compatibility aliases
  assert.equal(DEPTH_GUIDE.ESSENTIAL.minWords, DEPTH_GUIDE.FOCUSED.minWords);
  assert.equal(DEPTH_GUIDE.COMPREHENSIVE.minWords, DEPTH_GUIDE.DEEP.minWords);
});

test('Notes Generator v3 - resolveArchetype maps Plan v2 types and text semantics accurately', () => {
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

test('Notes Generator v3 - deriveDepthDirective calibrates word floors based on time and difficulty', () => {
  // By allocated minutes
  assert.equal(deriveDepthDirective('', 20), 'FOCUSED');
  assert.equal(deriveDepthDirective('', 45), 'STANDARD');
  assert.equal(deriveDepthDirective('', 70), 'DEEP');
  assert.equal(deriveDepthDirective('', 90), 'EXHAUSTIVE');

  // By raw text
  assert.equal(deriveDepthDirective('(20 min) Quick recall'), 'FOCUSED');
  assert.equal(deriveDepthDirective('(45 min) Regular chapter'), 'STANDARD');
  assert.equal(deriveDepthDirective('(70 min) Heavy derivation'), 'DEEP');
  assert.equal(deriveDepthDirective('(2 hrs) Masterclass'), 'EXHAUSTIVE');

  // By difficulty
  assert.equal(deriveDepthDirective('', null, 'Intense'), 'DEEP');
  assert.equal(deriveDepthDirective('', null, 'Easy'), 'FOCUSED');
  assert.equal(deriveDepthDirective('', null, 'Medium'), 'STANDARD');
});

test('Notes Generator v3 - stripTimePrefix cleans topic text', () => {
  assert.equal(stripTimePrefix('(45 min) Understand First Law of Thermodynamics'), 'Understand First Law of Thermodynamics');
  assert.equal(stripTimePrefix('(1.5 hrs) Derivation of Wave Equation'), 'Derivation of Wave Equation');
  assert.equal(stripTimePrefix('Clean text without timer'), 'Clean text without timer');
});

test('Notes Generator v3 - splitOutlineIntoSections accurately segments markdown headings', () => {
  const outline = `
### 1. Intuition & Mental Model
[MISCONCEPTION: Energy isn't destroyed]
Intro text here.

### 2. Formal Mathematical Formulation
[DERIVATION: First Law]
Equations here.

### 3. Worked Examples
[EXAMPLE NEEDED: Gas expansion]
Calculations here.
`;
  const sections = splitOutlineIntoSections(outline);
  assert.equal(sections.length, 3);
  assert.equal(sections[0].heading, '### 1. Intuition & Mental Model');
  assert.equal(sections[1].heading, '### 2. Formal Mathematical Formulation');
  assert.equal(sections[2].heading, '### 3. Worked Examples');
});

test('Notes Generator v3 - normalizeNoteMarkdown repairs LaTeX spacing and auto-closes details tags', () => {
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

test('Notes Generator v3 - prompts enforce anti-compression and visual design system', () => {
  const outlinePrompt = buildOutlinePrompt({
    examName: 'JEE Advanced',
    academicLevel: 'High School Competitive',
    examFormat: 'Theory',
    dayTopic: 'Thermodynamics',
    cleanSubTopic: 'First Law of Thermodynamics & Enthalpy',
    archetype: 'DERIVATION_DEEP_DIVE',
    depthDirective: 'DEEP',
    previousContext: 'Zeroth Law & Heat Capacities',
    strategicContext: { high_yield_topics: ['Enthalpy of Reaction'] },
  });

  assert.ok(outlinePrompt.includes('JEE Advanced'));
  assert.ok(outlinePrompt.includes('Derivation Deep-Dive'));
  assert.ok(outlinePrompt.includes('[MISCONCEPTION'));
  assert.ok(outlinePrompt.includes('[DERIVATION'));
  assert.ok(outlinePrompt.includes('[EXAM TRAP'));
  assert.ok(outlinePrompt.includes('3500'));

  const authorPrompt = buildAuthorPrompt({
    examName: 'JEE Advanced',
    academicLevel: 'High School Competitive',
    examFormat: 'Theory',
    dayTopic: 'Thermodynamics',
    cleanSubTopic: 'First Law of Thermodynamics & Enthalpy',
    archetype: 'DERIVATION_DEEP_DIVE',
    depthDirective: 'DEEP',
    previousContext: 'Zeroth Law',
    chapterOutline: '### 1. Mental Model\n[MISCONCEPTION: Energy created]',
    chunkMode: 'SINGLE',
  });

  assert.ok(authorPrompt.includes('Intuition & Mental Model'));
  assert.ok(authorPrompt.includes('Common Exam Trap'));
  assert.ok(authorPrompt.includes('30-Second Examiner Answer'));
  assert.ok(authorPrompt.includes('UNBREAKABLE KATEX MATH RULES'));
  assert.ok(authorPrompt.includes('<details>'));
  assert.ok(authorPrompt.includes('<summary>Reveal Step-by-Step Solution</summary>'));
  assert.ok(authorPrompt.includes('ANTI-COMPRESSION MANDATE'));
});

test('Notes Generator v3 - chunkMode correctly formats Part 1 and Part 2 author prompts', () => {
  const part1Prompt = buildAuthorPrompt({
    examName: 'GATE Computer Science',
    cleanSubTopic: 'Bayes Rule & Classification',
    chapterOutline: '### 1. Prior\n### 2. Likelihood',
    chunkMode: 'PART_1',
    depthDirective: 'DEEP',
  });
  assert.ok(part1Prompt.includes('PART 1 OF 2'));
  assert.ok(!part1Prompt.includes('Reveal Step-by-Step Solution'));

  const part2Prompt = buildAuthorPrompt({
    examName: 'GATE Computer Science',
    cleanSubTopic: 'Bayes Rule & Classification',
    chapterOutline: '### 3. Worked Example\n### 4. Self-Test',
    chunkMode: 'PART_2',
    depthDirective: 'DEEP',
    continuationSnippet: 'Final step of derivation completed.',
  });
  assert.ok(part2Prompt.includes('PART 2 OF 2'));
  assert.ok(part2Prompt.includes('Final step of derivation completed.'));
  assert.ok(part2Prompt.includes('Reveal Step-by-Step Solution'));
});

test('Notes Generator v3 - generateNoteBYOK and generateCustomNoteBYOK throw BYOK_NOT_CONNECTED when unauthenticated', async () => {
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
