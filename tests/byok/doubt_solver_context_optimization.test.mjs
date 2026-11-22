// tests/byok/doubt_solver_context_optimization.test.mjs
/**
 * Test Suite verifying Ask Doubt / AI Tutor Skeleton + Targeted Chunk context architecture:
 * 1. Outline Skeleton: Extracts chapter section headings into a global structural roadmap (~100 tokens).
 * 2. Core Formulas & Definitions: Extracts > **Definition:** blocks and $$...$$ display math blocks (~200 tokens).
 * 3. Targeted Section Chunk: Splits by headings and uses BM25 token overlap to select the 1–2 most relevant sections (~350–500 tokens).
 * 4. Short Note Bypass: Directly passes full note if word count < 600.
 * 5. Prompt Refactoring: buildCustomPrompt formats Roadmap + Definitions/Formulas + Relevant Section Content.
 * 6. Quick Highlight Actions: explain, analogy, importance remain focused on highlighted snippet.
 * 7. Token Reduction: Confirms ~80% context size reduction on textbook-length notes.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  tokenizeText,
  extractOutlineSkeleton,
  extractCoreDefinitionsAndEquations,
  splitNoteIntoSections,
  scoreSectionsBM25,
  selectTargetedSections,
  extractTargetedDoubtContext,
  buildCustomPrompt,
  buildQuickActionPrompt,
  solveDoubtBYOK,
} from '../../src/lib/byok/pipelines/doubtSolver.js';

// Helper to generate repetitive paragraphs to build a realistic 1,200+ word textbook note
function createLongTextbookNote() {
  const introParagraphs = Array(6)
    .fill(
      'Probability theory provides a foundational mathematical framework for reasoning under conditions of uncertainty. In classification tasks, an agent observes empirical evidence and must determine the most plausible underlying hypothesis or class label.'
    )
    .join('\n\n');

  const derivationParagraphs = Array(8)
    .fill(
      'From the product rule of joint probability, we know that P(A, B) = P(A|B)P(B) and equivalently P(A, B) = P(B|A)P(A). Equating both expressions yields Bayes theorem, allowing us to compute posterior distributions from likelihoods and priors.'
    )
    .join('\n\n');

  const workedNumericalParagraphs = Array(8)
    .fill(
      'Consider a clinical screening scenario where the baseline disease prevalence is 1 percent. A laboratory diagnostic test exhibits a true positive sensitivity of 99 percent and a false positive rate of 5 percent. We compute the marginal probability of testing positive across all patient cohorts.'
    )
    .join('\n\n');

  const misconceptionsParagraphs = Array(6)
    .fill(
      'A notorious cognitive pitfall in probabilistic reasoning is the base rate neglect error. Practitioners often mistakenly equate the probability of disease given a positive test with the probability of testing positive given disease.'
    )
    .join('\n\n');

  const connectionsParagraphs = Array(12)
    .fill(
      'Bayes theorem establishes the theoretical bedrock for naive Bayes classifiers, Kalman filtering, hidden Markov models, and modern variational inference algorithms across machine learning systems. In natural language processing, spam classification relies on word likelihood ratios. In robotics, Bayesian state estimation continuously updates robot position beliefs from noisy sensor readings.'
    )
    .join('\n\n');

  return `
### 1. Introduction and Historical Foundation
${introParagraphs}

### 2. Prior, Likelihood, Evidence, and Posterior Derivation
> **Definition:** The prior probability P(H) quantifies the initial degree of belief in hypothesis H before observing empirical evidence E.
> The likelihood P(E|H) expresses how probable the observed evidence would be assuming H is true.

$$P(H|E) = \\frac{P(E|H) P(H)}{P(E)}$$

${derivationParagraphs}

$$P(E) = \\sum_{k=1}^K P(E|H_k) P(H_k)$$

### 3. Worked Numerical Diagnostic Problem
${workedNumericalParagraphs}
**Example:** Clinical Diagnostic Screen
*Problem:* Calculate P(Disease | Positive Test) given prevalence = 0.01, sensitivity = 0.99, false positive = 0.05.
*Solution:* Marginal probability P(Positive) = (0.99 * 0.01) + (0.05 * 0.99) = 0.0594.
Final Answer: P(Disease | Positive) = 0.0099 / 0.0594 = 16.67%.

### 4. Common Exam Traps and Base Rate Fallacies
> ⚠️ **Common Misconception:** Believing that P(H|E) is symmetrical to P(E|H).
${misconceptionsParagraphs}

### 5. Advanced Machine Learning Connections
${connectionsParagraphs}
`;
}

test('Doubt Solver Context - tokenizeText filters punctuation and stop words', () => {
  const tokens = tokenizeText('How does Bayes rule update the prior probability with evidence?');
  assert.ok(tokens.includes('bayes'));
  assert.ok(tokens.includes('rule'));
  assert.ok(tokens.includes('update'));
  assert.ok(tokens.includes('prior'));
  assert.ok(tokens.includes('probability'));
  assert.ok(tokens.includes('evidence'));
  assert.ok(!tokens.includes('how'));
  assert.ok(!tokens.includes('does'));
  assert.ok(!tokens.includes('the'));
  assert.ok(!tokens.includes('with'));
});

test('Doubt Solver Context - extractOutlineSkeleton produces clean numbered chapter roadmap', () => {
  const note = `
### 1. Foundations of Kinematics
Content here...

### 2. Velocity and Acceleration Vectors
Content here...

### 3. Relative Motion Derivations
Content here...
`;
  const skeleton = extractOutlineSkeleton(note);
  assert.ok(skeleton.includes('1. 1. Foundations of Kinematics'));
  assert.ok(skeleton.includes('2. 2. Velocity and Acceleration Vectors'));
  assert.ok(skeleton.includes('3. 3. Relative Motion Derivations'));

  // Edge case: Empty note or note without headings
  assert.equal(extractOutlineSkeleton(''), 'No outline available.');
  assert.equal(extractOutlineSkeleton('Just some raw paragraphs without hashes'), 'No outline available.');
});

test('Doubt Solver Context - extractCoreDefinitionsAndEquations captures definitions and display math under budget', () => {
  const note = `
Some intro text.
> **Definition:** Kinetic energy is the energy possessed by an object due to its motion.
> Measured in Joules (J).

Here is the kinetic formula:
$$K = \\frac{1}{2} m v^2$$

And potential energy:
$$U = m g h$$
`;
  const core = extractCoreDefinitionsAndEquations(note);
  assert.ok(core.includes('> **Definition:** Kinetic energy'));
  assert.ok(core.includes('$$K = \\frac{1}{2} m v^2$$'));
  assert.ok(core.includes('$$U = m g h$$'));

  // Edge case: empty note
  assert.equal(extractCoreDefinitionsAndEquations(''), 'None.');
  assert.equal(extractCoreDefinitionsAndEquations('Just plain text without formulas'), 'None.');
});

test('Doubt Solver Context - selectTargetedSections selects relevant chunk via BM25 matching', () => {
  const longNote = createLongTextbookNote();
  const sections = splitNoteIntoSections(longNote);
  assert.equal(sections.length, 5);

  // Question targeting the worked numerical diagnostic problem
  const numericalQuery = 'How do I solve the clinical diagnostic screening calculation with 1% prevalence?';
  const selectedNumerical = selectTargetedSections(sections, numericalQuery);
  assert.ok(
    selectedNumerical.includes('### 3. Worked Numerical Diagnostic Problem'),
    'Must select Section 3 for clinical diagnostic problem'
  );

  // Question targeting the mathematical derivation
  const derivationQuery = 'Derive Bayes rule from the product rule of joint probability';
  const selectedDerivation = selectTargetedSections(sections, derivationQuery);
  assert.ok(
    selectedDerivation.includes('### 2. Prior, Likelihood, Evidence, and Posterior Derivation'),
    'Must select Section 2 for product rule derivation'
  );

  // Question targeting misconceptions
  const trapQuery = 'What is the base rate neglect error and fallacy?';
  const selectedTrap = selectTargetedSections(sections, trapQuery);
  assert.ok(
    selectedTrap.includes('### 4. Common Exam Traps and Base Rate Fallacies'),
    'Must select Section 4 for base rate fallacy'
  );
});

test('Doubt Solver Context - Short note (< 600 words) bypasses extraction and passes full note', () => {
  const shortNote = `
### 1. Ohm's Law
Ohm's law states that current is directly proportional to voltage across a conductor.
$$V = I R$$
> **Definition:** Resistance is the opposition to electrical current flow.
Unit: Ohms ($\\Omega$).
`;
  const words = shortNote.trim().split(/\s+/).filter(Boolean).length;
  assert.ok(words < 600, 'Test fixture must be short (< 600 words)');

  const extracted = extractTargetedDoubtContext(shortNote, 'What is resistance?');
  assert.equal(extracted.isShort, true);
  assert.ok(extracted.formattedContext.includes('Full note content (your primary source of truth):'));
  assert.ok(extracted.formattedContext.includes("Ohm's law states"));
  assert.equal(extracted.roadmap, '');
});

test('Doubt Solver Context - Long note (>= 600 words) achieves ~80% token reduction with Skeleton + Chunk', () => {
  const longNote = createLongTextbookNote();
  const totalWords = longNote.trim().split(/\s+/).filter(Boolean).length;
  assert.ok(totalWords > 1000, 'Fixture must be textbook-length (> 1000 words)');

  const query = 'How do we calculate marginal probability in the clinical test?';
  const extracted = extractTargetedDoubtContext(longNote, query);

  assert.equal(extracted.isShort, false);
  assert.ok(extracted.roadmap.includes('1. 1. Introduction and Historical Foundation'));
  assert.ok(extracted.roadmap.includes('3. 3. Worked Numerical Diagnostic Problem'));
  assert.ok(extracted.coreBlocks.includes('$$P(H|E) = \\frac{P(E|H) P(H)}{P(E)}$$'));
  assert.ok(extracted.relevantSections.includes('### 3. Worked Numerical Diagnostic Problem'));

  // Verify token/word reduction:
  const extractedWords = extracted.formattedContext.trim().split(/\s+/).filter(Boolean).length;
  const reductionRatio = (totalWords - extractedWords) / totalWords;

  assert.ok(
    reductionRatio >= 0.70,
    `Context size must be reduced by >= 70% (actual: ${(reductionRatio * 100).toFixed(1)}%, from ${totalWords} down to ${extractedWords} words)`
  );
});

test('Doubt Solver Context - buildCustomPrompt formats Roadmap + Definitions + Targeted Section', () => {
  const longNote = createLongTextbookNote();
  const context = {
    examName: 'GATE Computer Science',
    dayTopic: 'Probability & Statistics',
    subTopic: 'Bayes Rule & Classification',
  };

  const prompt = buildCustomPrompt(
    'Explain the clinical diagnostic problem step by step',
    longNote,
    context
  );

  assert.ok(prompt.includes('GATE Computer Science'));
  assert.ok(prompt.includes('Chapter Roadmap:'));
  assert.ok(prompt.includes('Core Definitions & Equations:'));
  assert.ok(prompt.includes('Relevant Section Content:'));
  assert.ok(prompt.includes('### 3. Worked Numerical Diagnostic Problem'));
  assert.ok(prompt.includes('My question: "Explain the clinical diagnostic problem step by step"'));
});

test('Doubt Solver Context - buildQuickActionPrompt keeps focused snippet without note dump', () => {
  const context = {
    examName: 'IIT JEE',
    dayTopic: 'Thermodynamics',
    subTopic: 'First Law of Thermodynamics',
  };

  const explainPrompt = buildQuickActionPrompt(
    'explain',
    '\\Delta U = Q - W',
    context,
    'Explain the highlighted text clearly and precisely.'
  );

  assert.ok(explainPrompt.includes('IIT JEE'));
  assert.ok(explainPrompt.includes('> "\\Delta U = Q - W"'));
  assert.ok(!explainPrompt.includes('Chapter Roadmap:'));
  assert.ok(!explainPrompt.includes('Full note content'));
});

test('Doubt Solver Context - solveDoubtBYOK throws BYOK_NOT_CONNECTED when unauthenticated', async () => {
  const context = {
    examName: 'Medical Board',
    dayTopic: 'Physiology',
    subTopic: 'Renal Clearance',
  };

  let thrown = null;
  try {
    await solveDoubtBYOK({
      action: 'custom',
      context,
      question: 'What is GFR?',
      fullNoteContent: '### 1. GFR\nGlomerular filtration rate is key.',
    });
  } catch (err) {
    thrown = err;
  }

  assert.ok(thrown);
  assert.equal(thrown.code, 'BYOK_NOT_CONNECTED');
});
