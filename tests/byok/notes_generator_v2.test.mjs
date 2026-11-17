// tests/byok/notes_generator_v2.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ARCHETYPES,
  DEPTH_GUIDE,
  deriveDepthDirective,
  extractAllocatedMinutes,
  resolveArchetype,
  stripTimePrefix,
  splitOutlineIntoSections,
  normalizeNoteMarkdown,
  buildOutlinePrompt,
  buildAuthorPrompt,
  generateNoteBYOK,
  generateCustomNoteBYOK,
} from '../../src/lib/byok/pipelines/notesGenerator.js';

test('Notes Generator v3.1 - ARCHETYPES and DEPTH_GUIDE provide qualitative guidance without hardcoded word limits', () => {
  assert.ok(ARCHETYPES.CONCEPT_MASTER);
  assert.ok(ARCHETYPES.DERIVATION_DEEP_DIVE);
  assert.ok(ARCHETYPES.PROBLEM_SOLVING);
  assert.ok(ARCHETYPES.VIVA_DRILL);
  assert.ok(ARCHETYPES.LAB_PROCEDURE);

  // Depth guide provides qualitative guidance
  assert.ok(DEPTH_GUIDE.FOCUSED.directive.includes('FOCUSED'));
  assert.ok(DEPTH_GUIDE.STANDARD.directive.includes('STANDARD'));
  assert.ok(DEPTH_GUIDE.DEEP.directive.includes('DEEP'));
  assert.ok(DEPTH_GUIDE.EXHAUSTIVE.directive.includes('EXHAUSTIVE'));

  // Backward compatibility aliases exist
  assert.ok(DEPTH_GUIDE.ESSENTIAL.directive);
  assert.ok(DEPTH_GUIDE.COMPREHENSIVE.directive);
});

test('Notes Generator v3.1 - resolveArchetype maps Plan v2 types and text semantics accurately', () => {
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

test('Notes Generator v3.1 - extractAllocatedMinutes and deriveDepthDirective accurately parse time budgets', () => {
  // Parsing minutes
  assert.equal(extractAllocatedMinutes('(45 min) Core topic'), 45);
  assert.equal(extractAllocatedMinutes('(1.5 hrs) Heavy proof'), 90);
  assert.equal(extractAllocatedMinutes('No time prefix', 30), 30);
  assert.equal(extractAllocatedMinutes('No time prefix', null), null);

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

test('Notes Generator v3.1 - stripTimePrefix cleans topic text', () => {
  assert.equal(stripTimePrefix('(45 min) Understand First Law of Thermodynamics'), 'Understand First Law of Thermodynamics');
  assert.equal(stripTimePrefix('(1.5 hrs) Derivation of Wave Equation'), 'Derivation of Wave Equation');
  assert.equal(stripTimePrefix('Clean text without timer'), 'Clean text without timer');
});

test('Notes Generator v3.1 - splitOutlineIntoSections accurately segments markdown headings', () => {
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

test('Notes Generator v3.1 - normalizeNoteMarkdown repairs LaTeX spacing and auto-closes details tags', () => {
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

test('Notes Generator v3.1 - prompts enforce Scope Fence and Anti-Overcomplication', () => {
  const outlinePrompt = buildOutlinePrompt({
    examName: 'University Exam',
    academicLevel: 'Undergraduate',
    examFormat: 'Theory',
    dayTopic: 'Thermodynamics',
    cleanSubTopic: 'First Law of Thermodynamics & Enthalpy',
    archetype: 'DERIVATION_DEEP_DIVE',
    depthDirective: 'STANDARD',
    previousContext: 'Zeroth Law',
    upcomingContext: 'Second Law of Thermodynamics → Carnot Cycle',
    positionContext: 'Subtopic 2 of 5 (Day 1)',
    allocatedMinutes: 40,
  });

  assert.ok(outlinePrompt.includes('University Exam'));
  assert.ok(outlinePrompt.includes('STRICT SCOPE FENCE'));
  assert.ok(outlinePrompt.includes('Second Law of Thermodynamics'));
  assert.ok(outlinePrompt.includes('40 minutes'));
  assert.ok(outlinePrompt.includes('[MISCONCEPTION'));
  assert.ok(outlinePrompt.includes('[DERIVATION'));

  const authorPrompt = buildAuthorPrompt({
    examName: 'University Exam',
    academicLevel: 'Undergraduate',
    examFormat: 'Theory',
    dayTopic: 'Thermodynamics',
    cleanSubTopic: 'First Law of Thermodynamics & Enthalpy',
    archetype: 'DERIVATION_DEEP_DIVE',
    depthDirective: 'STANDARD',
    previousContext: 'Zeroth Law',
    upcomingContext: 'Second Law of Thermodynamics → Carnot Cycle',
    allocatedMinutes: 40,
    chapterOutline: '### 1. Mental Model\n[MISCONCEPTION: Energy created]',
    chunkMode: 'SINGLE',
  });

  assert.ok(authorPrompt.includes('Intuition & Mental Model'));
  assert.ok(authorPrompt.includes('Common Exam Trap'));
  assert.ok(authorPrompt.includes('30-Second Examiner Answer'));
  assert.ok(authorPrompt.includes('STRICT SCOPE FENCE'));
  assert.ok(authorPrompt.includes('Second Law of Thermodynamics'));
  assert.ok(authorPrompt.includes('UNBREAKABLE KATEX MATH RULES'));
  assert.ok(authorPrompt.includes('<details>'));
  assert.ok(authorPrompt.includes('<summary>Reveal Step-by-Step Solution</summary>'));
  assert.ok(authorPrompt.includes('Do NOT turn this into a 26-page dissertation'));
});

test('Notes Generator v3.1 - parallel chunkMode correctly formats Part 1 and Part 2 author prompts', () => {
  const part1Prompt = buildAuthorPrompt({
    examName: 'GATE Computer Science',
    cleanSubTopic: 'Bayes Rule & Classification',
    chapterOutline: '### 1. Prior\n### 2. Likelihood',
    chunkMode: 'PART_1',
    depthDirective: 'STANDARD',
  });
  assert.ok(part1Prompt.includes('PART 1 OF 2 - PARALLEL AUTHORING'));
  assert.ok(!part1Prompt.includes('Reveal Step-by-Step Solution'));

  const part2Prompt = buildAuthorPrompt({
    examName: 'GATE Computer Science',
    cleanSubTopic: 'Bayes Rule & Classification',
    chapterOutline: '### 3. Worked Example\n### 4. Self-Test',
    chunkMode: 'PART_2',
    depthDirective: 'STANDARD',
    part1HeadingsSummary: '### 1. Prior, ### 2. Likelihood',
  });
  assert.ok(part2Prompt.includes('PART 2 OF 2 - PARALLEL AUTHORING'));
  assert.ok(part2Prompt.includes('### 1. Prior, ### 2. Likelihood'));
  assert.ok(part2Prompt.includes('Reveal Step-by-Step Solution'));
});

test('Notes Generator v3.1 - generateNoteBYOK and generateCustomNoteBYOK throw BYOK_NOT_CONNECTED when unauthenticated', async () => {
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
