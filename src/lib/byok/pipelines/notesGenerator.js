// src/lib/byok/pipelines/notesGenerator.js
/**
 * KalPad Notes Generation Engine v3: The Pedagogical Masterpiece System
 *
 * Built on the "Teach Like You Mean It" philosophy:
 *   - Complete, self-contained textbook chapters that teach subtopics from scratch.
 *   - Free-form Markdown outlines with rich pedagogical annotations ([MISCONCEPTION], [EXAMPLE NEEDED], etc.)
 *     instead of rigid, formulaic JSON schemas.
 *   - Word budget FLOORS (minimum commitments) rather than caps/ceilings.
 *   - Pedagogical Archetypes as tone & rigor hints rather than rigid structural straightjackets.
 *   - Multi-chunk authoring for deep/exhaustive topics (splitting at section boundaries to prevent token truncation).
 *   - Anti-wall-of-text visual cards: 💡 Intuition, ⚠️ Exam Traps & Misconceptions, 🎯 30s Examiner Answers.
 *   - Unbreakable KaTeX ($...$ inline, $$...$$ display with blank lines before/after).
 *   - Interactive Active Recall Self-Tests (<details><summary>Reveal Solution</summary></details>).
 *   - Full backward compatibility with existing call sites and custom notes.
 */

import supabase from '../../supabaseClient.js';
import { ensureByokConnected, generateText, resolveModelForTask } from '../openai.js';
import { sanitizeDoubleEscapedLatex } from '../jsonSanitizer.js';
import { preprocessMathBlocks } from '../../noteMarkdown.js';

// =============================================================================
// 1. ARCHETYPES & TONE FLAVORING
// =============================================================================

export const ARCHETYPES = {
  CONCEPT_MASTER: {
    id: 'CONCEPT_MASTER',
    label: 'Concept Master',
    focus: 'Intuitive mental models, formal definitions, physical analogies, and comparison matrices.',
    toneHint:
      'TONE HINT: Prioritize intuitive physical/conceptual grounding before formal mathematical laws. Use clear analogies, contrasting matrices, and bridge everyday intuition to rigorous academic principles.',
  },
  DERIVATION_DEEP_DIVE: {
    id: 'DERIVATION_DEEP_DIVE',
    label: 'Derivation Deep-Dive',
    focus: 'Physical axioms, explicit assumptions, line-by-line algebraic proof, exam mistake alerts, and boundary analysis.',
    toneHint:
      'TONE HINT: Prioritize mathematical rigor. State all axioms and assumptions explicitly. Show every line of algebraic manipulation without skipping steps. Analyze boundary limits and flag algebraic exam traps.',
  },
  PROBLEM_SOLVING: {
    id: 'PROBLEM_SOLVING',
    label: 'Problem-Solving Blueprint',
    focus: 'Question pattern recognition, universal 4-step algorithm, graded worked PYQs, and calculation pitfalls.',
    toneHint:
      'TONE HINT: Prioritize systematic problem breakdown. Provide a universal solution framework and multiple graded worked numericals with realistic parameters, unit conversions, and calculation traps.',
  },
  VIVA_DRILL: {
    id: 'VIVA_DRILL',
    label: 'Viva Oral Combat Kit',
    focus: '30-second oral answers, cross-questioning traps, counter-intuitive edge cases, and rapid-fire drills.',
    toneHint:
      'TONE HINT: Prioritize oral clarity and rapid recall. Formulate crisp 30-second spoken responses that examiners reward with top marks, anticipate hostile cross-questions, and expose counter-intuitive edge cases.',
  },
  LAB_PROCEDURE: {
    id: 'LAB_PROCEDURE',
    label: 'Lab & Procedure Manual',
    focus: 'Apparatus setup, procedural protocol, sample observation tables, error analysis, and precautions.',
    toneHint:
      'TONE HINT: Prioritize practical, reproducible execution. Detail apparatus specifications, circuit/optical alignment, step-by-step procedural protocols, observation tables, calculation formulas, and sources of systematic error.',
  },
};

// =============================================================================
// 2. DEPTH DIRECTIVES & WORD FLOORS
// =============================================================================

export const DEPTH_GUIDE = {
  FOCUSED: {
    level: 'FOCUSED',
    minWords: 1200,
    targetWords: '≥ 1,200 words (Floor)',
    directive:
      'FOCUSED — Minimum 1,200 words. Cover foundational definitions, physical intuition, governing equations, and 1 concrete worked example. No skipping core mechanisms.',
  },
  ESSENTIAL: {
    // Backward-compatible alias
    level: 'FOCUSED',
    minWords: 1200,
    targetWords: '≥ 1,200 words (Floor)',
    directive:
      'FOCUSED — Minimum 1,200 words. Cover foundational definitions, physical intuition, governing equations, and 1 concrete worked example. No skipping core mechanisms.',
  },
  STANDARD: {
    level: 'STANDARD',
    minWords: 2500,
    targetWords: '≥ 2,500 words (Floor)',
    directive:
      'STANDARD — Minimum 2,500 words. Full pedagogical treatment: intuitive mental models, complete step-by-step explanations, full derivations or algorithmic procedures, 2 graded worked examples, common misconceptions, and active recall.',
  },
  DEEP: {
    level: 'DEEP',
    minWords: 3500,
    targetWords: '≥ 3,500 words (Floor)',
    directive:
      'DEEP — Minimum 3,500 words. Exhaustive academic chapter: every single concept and derivation fully unpacked without skipping algebraic steps, multiple graded examples (standard & tricky), boundary conditions, exam traps, and active recall.',
  },
  COMPREHENSIVE: {
    // Backward-compatible alias
    level: 'DEEP',
    minWords: 3500,
    targetWords: '≥ 3,500 words (Floor)',
    directive:
      'DEEP — Minimum 3,500 words. Exhaustive academic chapter: every single concept and derivation fully unpacked without skipping algebraic steps, multiple graded examples (standard & tricky), boundary conditions, exam traps, and active recall.',
  },
  EXHAUSTIVE: {
    level: 'EXHAUSTIVE',
    minWords: 5000,
    targetWords: '≥ 5,000 words (Floor)',
    directive:
      'EXHAUSTIVE — Minimum 5,000 words. Masterclass textbook chapter: complete rigor from scratch, foundational axioms, line-by-line proofs with no steps omitted, 3+ graded problems, edge cases, examiner tricks, and comprehensive self-tests.',
  },
};

// =============================================================================
// 3. PARSERS & CLASSIFIERS
// =============================================================================

export function stripTimePrefix(text = '') {
  return String(text)
    .replace(/^\s*\(\s*[\d.]+\s*(?:h|hr|hrs|hour|hours|min|mins|minute|minutes)\s*\)\s*/i, '')
    .trim();
}

export function deriveDepthDirective(rawText = '', allocatedMinutes = null, difficulty = null) {
  if (typeof allocatedMinutes === 'number' && allocatedMinutes > 0) {
    if (allocatedMinutes <= 25) return 'FOCUSED';
    if (allocatedMinutes <= 50) return 'STANDARD';
    if (allocatedMinutes <= 75) return 'DEEP';
    return 'EXHAUSTIVE';
  }

  const match = String(rawText).match(
    /^\s*\(\s*([\d.]+)\s*(h|hr|hrs|hour|hours|min|mins|minute|minutes)\s*\)/i
  );

  if (match) {
    const hours = match[2].toLowerCase().startsWith('h')
      ? parseFloat(match[1])
      : parseFloat(match[1]) / 60;
    if (hours < 0.5) return 'FOCUSED';
    if (hours < 0.9) return 'STANDARD';
    if (hours < 1.4) return 'DEEP';
    return 'EXHAUSTIVE';
  }

  if (difficulty === 'Intense') return 'DEEP';
  if (difficulty === 'Easy') return 'FOCUSED';
  return 'STANDARD';
}

export function resolveArchetype({
  subTopicType = '',
  subTopicText = '',
  examFormat = '',
  archetypeOverride = null,
} = {}) {
  if (archetypeOverride && ARCHETYPES[archetypeOverride]) {
    return ARCHETYPES[archetypeOverride].id;
  }

  // 1. Direct type match from Plan Generator v2
  const normalizedType = String(subTopicType || '').toLowerCase();
  if (normalizedType === 'derivation') return 'DERIVATION_DEEP_DIVE';
  if (normalizedType === 'practice') return 'PROBLEM_SOLVING';
  if (normalizedType === 'viva_drill') return 'VIVA_DRILL';
  if (normalizedType === 'lab_procedure') return 'LAB_PROCEDURE';
  if (normalizedType === 'concept') return 'CONCEPT_MASTER';

  // 2. Text-based semantic classification
  const text = String(subTopicText || '').toLowerCase();
  if (/\b(derive|derivation|proof|prove\s+that|expression\s+for|deduce)\b/i.test(text)) {
    return 'DERIVATION_DEEP_DIVE';
  }
  if (/\b(viva|oral|interview|rapid[- ]fire|cross[- ]question|q&a)\b/i.test(text)) {
    return 'VIVA_DRILL';
  }
  if (/\b(solve|numerical|problems?|calculation|pyq|practice\s+set)\b/i.test(text)) {
    return 'PROBLEM_SOLVING';
  }
  if (/\b(lab|experiment|procedure|apparatus|observation|precautions?)\b/i.test(text)) {
    return 'LAB_PROCEDURE';
  }

  // 3. Exam format fallback
  const format = String(examFormat || '').toLowerCase();
  if (format === 'viva') return 'VIVA_DRILL';
  if (format === 'practical') return 'LAB_PROCEDURE';

  return 'CONCEPT_MASTER';
}

/**
 * Splits a Markdown outline into distinct sections based on '### ' headers.
 */
export function splitOutlineIntoSections(outlineMarkdown = '') {
  const lines = String(outlineMarkdown || '').split('\n');
  const sections = [];
  let currentSection = null;

  for (const line of lines) {
    if (/^###\s+/.test(line)) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = { heading: line.trim(), lines: [line] };
    } else if (currentSection) {
      currentSection.lines.push(line);
    }
  }
  if (currentSection) {
    sections.push(currentSection);
  }
  return sections;
}

// =============================================================================
// 4. PROMPT BUILDERS
// =============================================================================

export function buildOutlinePrompt({
  examName,
  academicLevel,
  examFormat,
  dayTopic,
  cleanSubTopic,
  archetype,
  depthDirective,
  previousContext,
  strategicContext,
}) {
  const depthConfig = DEPTH_GUIDE[depthDirective] || DEPTH_GUIDE.STANDARD;
  const archetypeConfig = ARCHETYPES[archetype] || ARCHETYPES.CONCEPT_MASTER;

  return `You are a world-class academic curriculum architect and senior university professor.
Your task is to create an exhaustive, deep pedagogical Markdown outline for a definitive, self-contained study chapter.
When an author AI follows this outline, the resulting note MUST teach the subtopic in its ENTIRETY so that a student needs NO other textbook, lecture, or external resource.

CONTEXT:
- Target Exam: "${examName}"
- Academic Level: "${academicLevel || 'Standard University'}"
- Target Exam Format: "${examFormat || 'Comprehensive Theory & Practice'}"
- Primary Chapter / Topic: "${dayTopic}"
- Sub-Topic to Master: "${cleanSubTopic}"
- Tone & Archetype Flavor: ${archetypeConfig.label} (${archetypeConfig.focus})
- Depth Directive: ${depthConfig.directive}
- Word Budget Commitment: At least ${depthConfig.minWords} words
- Prerequisites Already Understood (use as known axioms): [${previousContext || 'Foundational Basics'}]
${strategicContext ? `- Strategic Context: ${JSON.stringify(strategicContext)}` : ''}

${archetypeConfig.toneHint}

CORE CURRICULUM UNPACKING RULES:
1. EXHAUSTIVE SCOPE:
   If the sub-topic text mentions multiple components, concepts, derivations, formulas, or procedures
   (e.g., "(40 min) Review prior, likelihood, evidence, and posterior probability, and derive Bayes' rule from the joint-probability identity; work through a small two-class numerical example..."),
   the outline MUST dedicate a FULL major section to EVERY SINGLE ONE of those items. Never lump them together into vague summaries.
2. PROCEDURAL & TECHNICAL CLARITY:
   If the sub-topic involves programming, hardware description (e.g., VHDL, Verilog), or laboratory experiments,
   outline the complete progression from scratch (e.g. Entity declaration, architecture body, concurrent signal assignment, component instantiation, behavioral processes, compilation, testbench simulation, and expected waveforms).
3. FLOW & PROGRESSION:
   Start with intuitive mental models and real-world grounding, advance to rigorous definitions and mathematical formalisms, work through complete derivations and concrete numericals, and conclude with exam traps and active recall.

OUTLINE ANNOTATIONS REQUIRED:
For each major section, include bracketed guidance annotations to instruct the author AI on exactly what to teach:
- [MISCONCEPTION: the specific wrong intuition students make at this point and how to correct it]
- [EXAMPLE NEEDED: the concrete worked problem or numerical with realistic numbers]
- [DERIVATION: start axiom, intermediate algebraic steps, and final expression]
- [STEP-BY-STEP: explicit algorithmic, procedural, or code walkthrough]
- [EXAM TRAP: specific marking criteria or deduction risks in ${examName}]
- [COMPARISON TABLE: contrasting concepts, pros/cons, or conditions]
- [VIVA DRILL: crisp 30-second examiner answer and tricky follow-up]

OUTPUT FORMAT:
Return ONLY a structured Markdown outline using '### ' for major sections and '#### ' for subsections.
Do NOT include conversational preambles, introductory chatter, or conclusion summaries. Output pure Markdown outline.`;
}

// Backward-compatible alias for buildBlueprintPrompt
export function buildBlueprintPrompt(params) {
  return buildOutlinePrompt(params);
}

export function buildAuthorPrompt({
  examName,
  academicLevel,
  examFormat,
  dayTopic,
  cleanSubTopic,
  archetype,
  depthDirective,
  previousContext,
  chapterOutline,
  chunkMode = 'SINGLE', // 'SINGLE' | 'PART_1' | 'PART_2'
  continuationSnippet = '',
}) {
  const depthConfig = DEPTH_GUIDE[depthDirective] || DEPTH_GUIDE.STANDARD;
  const archetypeConfig = ARCHETYPES[archetype] || ARCHETYPES.CONCEPT_MASTER;

  let chunkInstructions = '';
  let targetWordFloor = depthConfig.minWords;

  if (chunkMode === 'PART_1') {
    targetWordFloor = Math.round(depthConfig.minWords * 0.55);
    chunkInstructions = `
CHUNK DIRECTIVE (PART 1 OF 2):
You are authoring PART 1 of a 2-part master study chapter.
- Thoroughly write out all sections in the outline provided below.
- Write at least ${targetWordFloor} words for this part.
- Do NOT add active recall questions or final conclusions yet; stop cleanly after the last section of this Part 1 outline so Part 2 can continue seamlessly.
`;
  } else if (chunkMode === 'PART_2') {
    targetWordFloor = Math.round(depthConfig.minWords * 0.55);
    chunkInstructions = `
CHUNK DIRECTIVE (PART 2 OF 2):
You are authoring PART 2 of a 2-part master study chapter.
${continuationSnippet ? `The previous part ended with the following text for your context:\n"""\n...${continuationSnippet}\n"""\n` : ''}
- Continue seamlessly from where Part 1 ended. Do not re-teach Part 1 topics.
- Cover all remaining sections in the outline provided below.
- Write at least ${targetWordFloor} words for this part.
- Include the final Connections section and the interactive Check Your Understanding (Active Recall with <details> foldables) section at the very end of Part 2.
`;
  }

  return `You are a world-class academic author and master educator. Your writing sits between a brilliant university textbook and an inspiring private tutor — technically rigorous, mathematically complete, and engagingly clear.
Your mission is to author a complete, self-contained textbook chapter on "${cleanSubTopic}".
When the student finishes reading, they must understand the subtopic in its ENTIRETY—everything needed for ${examName}, not more, not less. No outside resources required.

CONTEXT:
- Target Exam: "${examName}" (${academicLevel || 'University'})
- Chapter: "${dayTopic}"
- Sub-Topic to Master: "${cleanSubTopic}"
- Archetype & Tone Focus: ${archetypeConfig.label}
- Depth Directive: ${depthConfig.directive}
- Minimum Word Count Commitment: Write AT LEAST ${targetWordFloor} words. Quality, completeness, and exhaustive depth always trump brevity.
- Prerequisites (Known axioms — build forward from them, do not re-explain): [${previousContext || 'None'}]
${chunkInstructions}

OUTLINE TO EXPAND INTO THE CHAPTER:
---
${chapterOutline}
---

PEDAGOGICAL & VISUAL WRITING RULES (ANTI-WALL-OF-TEXT):

1. FOLLOW THE OUTLINE EXHAUSTIVELY:
   Cover every section and every bracketed annotation in the outline. If the outline lists 6 sections, your chapter must contain all 6 sections. Do not combine, skip, or compress sections into bullet points.

2. ANTI-COMPRESSION MANDATE (TEACH, DO NOT SKIM):
   - Never say "similarly, it can be shown that...", "left as an exercise to the reader", or "this easily generalizes to...". Show the derivation!
   - Never skip algebraic derivation steps. Write out every intermediate line with justification.
   - Never present a naked formula without explaining the physical/conceptual intuition of WHY it takes that form.
   - For code or simulation topics (e.g., VHDL, Verilog, Python, C++): provide complete, syntactically valid code blocks with line-by-line breakdown, explain concurrent vs sequential semantics, and describe simulated timing/waveforms.

3. VISUAL CALLOUT CARDS:
   Punctuate the prose with distinct visual blockquotes:
   > 💡 **Intuition & Mental Model:** [Clear, intuitive analogy or physical intuition before presenting formal theory]
   > ⚠️ **Common Exam Trap / Misconception:** [The exact misconception that loses students marks in ${examName}, followed by the clear correct fact]
   > 🎯 **30-Second Examiner Answer:** [For definitions and viva oral questions: verbatim crisp response that earns full marks]
   > **Definition:** [Precise formal academic definition, with the term **bolded** on first use]

4. UNBREAKABLE KATEX MATH RULES:
   - Inline math: Use single dollar signs: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$
   - Display (block) math: Use double dollar signs with a BLANK LINE BEFORE AND AFTER:

$$
P(A \\mid B) = \\frac{P(B \\mid A) \\cdot P(A)}{P(B)}
$$

   - FORBIDDEN: Never use \\\\[...\\\\] or \\\\(...\\\\). Never use \\begin{equation} or \\begin{eqnarray}.
   - Permitted environments: {matrix}, {pmatrix}, {bmatrix}, {align}, {aligned}, {cases}.
   - MANDATORY SYMBOL GLOSSARY: Immediately after every major equation, write:
     **where** $X$ = [meaning with SI unit], $Y$ = [meaning with SI unit]...

5. STRUCTURED COMPARISON TABLES:
   Whenever comparing concepts, modeling styles, formulas, or methods, use clean Markdown tables with distinct headers.

6. FULLY WORKED GRADED EXAMPLES:
   Format worked examples with realistic parameters and explicit step-by-step numbering:
   ### Worked Example: [Descriptive Problem Title]
   **Problem Statement:** [Clear scenario with specific numbers/conditions]
   **Solution:**
   - **Step 1 (Physical Setup & Givens):** Identify knowns and state assumptions...
   - **Step 2 (Governing Equations):** State the formula and isolate the target variable...
   - **Step 3 (Step-by-Step Calculation):** Calculate with intermediate values and units...
   - **Final Result:** **[Boxed / Bold answer with SI units]**
   > 💡 **Key Takeaway:** [One sentence on the core lesson for exams]

${
  chunkMode === 'PART_1'
    ? '7. CLEAN ENDING FOR PART 1: Conclude Part 1 cleanly after its last section. Do not add Check Your Understanding questions.'
    : `7. ACTIVE RECALL CHECKPOINTS (FOLDABLE):
   End the chapter with 3 to 4 progressive self-test questions using native HTML <details> tags so the student can test themselves before inspecting the answer:
   
   ### Check Your Understanding (Active Recall)
   
   **Q1:** [Conceptual or Numerical Question]
   <details>
   <summary>Reveal Step-by-Step Solution</summary>
   
   [Full explanation, derivation, or calculation]
   </details>

8. CONNECTIONS TO THE BIG PICTURE:
   Before the Active Recall section, include:
   **Builds on:** [prerequisite concepts]
   **Unlocks:** [future topics this enables]
   **In ${examName}:** [how this topic is tested, mark weightage, and examiner expectations]`
}

9. NO REDUNDANT TOP-LEVEL TITLE:
   Do not repeat the sub-topic name as an H1 or H2 header at the start. Begin directly with the first section.`;
}

// Backward-compatible alias for buildVisualAuthorPrompt
export function buildVisualAuthorPrompt(params) {
  // If params has blueprint with mental_model_hook, format it into chapterOutline
  let chapterOutline = params.chapterOutline;
  if (!chapterOutline && params.blueprint) {
    if (typeof params.blueprint === 'string') {
      chapterOutline = params.blueprint;
    } else {
      chapterOutline = `### 1. Intuition & Foundations\n${params.blueprint.mental_model_hook || ''}\n\n### 2. Core Principles & Formulations\n${(params.blueprint.pedagogical_sections || []).map((s) => `#### ${s.section_title}\n${s.core_instruction}`).join('\n\n')}`;
    }
  }
  return buildAuthorPrompt({
    ...params,
    chapterOutline: chapterOutline || '### Core Fundamentals\n[EXAMPLE NEEDED: Standard problem]',
  });
}

// =============================================================================
// 5. NORMALIZATION & SANITIZATION
// =============================================================================

export function normalizeNoteMarkdown(rawMarkdown = '') {
  if (!rawMarkdown) return '';

  // 1. Sanitize double-escaped LaTeX (\\\\frac -> \\frac)
  let text = sanitizeDoubleEscapedLatex(rawMarkdown);

  // 2. Preprocess display math blocks to ensure whitespace around $$
  text = preprocessMathBlocks(text);

  // 3. Ensure unclosed <details> blocks are closed
  const openDetailsCount = (text.match(/<details>/gi) || []).length;
  const closeDetailsCount = (text.match(/<\/details>/gi) || []).length;
  if (openDetailsCount > closeDetailsCount) {
    const diff = openDetailsCount - closeDetailsCount;
    text += '\n' + '</details>\n'.repeat(diff);
  }

  return text.trim();
}

// =============================================================================
// 6. CORE PIPELINE: PLAN-ATTACHED NOTE GENERATION
// =============================================================================

/**
 * Generates a deep, textbook-grade study note directly in the browser using the user's connected ChatGPT BYOK quota.
 * Automatically inherits rich context from Plan Generator v2 and applies chunked authoring when needed.
 *
 * @param {Object} params
 * @param {number|string} [params.planTopicId]
 * @param {string} params.subTopicText
 * @param {string} [params.examName]
 * @param {string} [params.dayTopic]
 * @param {boolean} [params.isGuest=false]
 * @param {string} [params.subTopicType]
 * @param {string} [params.difficulty]
 * @param {number} [params.allocatedMinutes]
 * @param {Object} [params.customContext]
 * @param {(status: string|Object) => void} [params.onStatus]
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<{ note: Object }>}
 */
export async function generateNoteBYOK({
  planTopicId,
  subTopicText,
  examName = 'University Examination',
  dayTopic = 'Core Subject',
  isGuest = false,
  subTopicType,
  difficulty,
  allocatedMinutes,
  customContext,
  onStatus,
  signal,
}) {
  const token = await ensureByokConnected();

  const cleanSubTopic = stripTimePrefix(subTopicText);

  // Model Resolution
  const [outlineModel, authorModel] = await Promise.all([
    resolveModelForTask('notesOutlineModel', { accessToken: token }),
    resolveModelForTask('notesAuthorModel', { accessToken: token }),
  ]);

  let previousContext = 'None. This is the foundational topic in the study plan.';
  let academicLevel = 'Standard University';
  let examFormat = 'Comprehensive';
  let strategicContext = null;
  let resolvedSubTopicType = subTopicType;
  let resolvedDifficulty = difficulty;
  let resolvedMinutes = allocatedMinutes;
  let planId = null;

  // 1. Ingest Plan Generator v2 context from Supabase if planTopicId is provided
  if (!isGuest && planTopicId) {
    try {
      const { data: topicData, error: topicError } = await supabase
        .from('plan_topics')
        .select(
          `
          plan_id,
          day,
          topic_name,
          study_hours,
          importance,
          day_difficulty,
          day_summary,
          sub_topics,
          study_plans (
            exam_name,
            exam_persona,
            generation_context,
            syllabus
          )
        `
        )
        .eq('id', planTopicId)
        .single();

      if (!topicError && topicData) {
        planId = topicData.plan_id;
        dayTopic = topicData.topic_name || dayTopic;
        resolvedDifficulty = resolvedDifficulty || topicData.day_difficulty;

        const studyPlan = topicData.study_plans;
        if (studyPlan) {
          examName = studyPlan.exam_name || examName;

          // Extract Plan v2 Strategic Context
          if (studyPlan.generation_context) {
            try {
              const parsedGen =
                typeof studyPlan.generation_context === 'string'
                  ? JSON.parse(studyPlan.generation_context)
                  : studyPlan.generation_context;

              strategicContext = parsedGen;
              academicLevel = parsedGen.academic_level || academicLevel;
              examFormat = parsedGen.target_format || parsedGen.exam_format || examFormat;
            } catch (_) {}
          }
        }

        // Match subtopic from sub_topics array to extract exact type, difficulty, and minute budget
        if (Array.isArray(topicData.sub_topics)) {
          const match = topicData.sub_topics.find(
            (st) =>
              stripTimePrefix(st.text || '').toLowerCase() === cleanSubTopic.toLowerCase() ||
              (st.text || '').includes(cleanSubTopic)
          );
          if (match) {
            resolvedSubTopicType = resolvedSubTopicType || match.type;
            resolvedDifficulty = resolvedDifficulty || match.difficulty;
          }
        }

        // Fetch preceding topics to create a real prerequisite bridge
        const { data: historyData } = await supabase
          .from('plan_topics')
          .select('sub_topics, topic_name')
          .eq('plan_id', planId)
          .lte('day', topicData.day)
          .order('day', { ascending: true });

        if (historyData) {
          const allTopics = historyData.flatMap(
            (d) => d.sub_topics?.map((st) => stripTimePrefix(st.text)) || []
          );
          const currentIndex = allTopics.indexOf(cleanSubTopic);
          if (currentIndex > 0) {
            const prev = allTopics.slice(Math.max(0, currentIndex - 3), currentIndex);
            if (prev.length > 0) previousContext = prev.join(' → ');
          }
        }
      }
    } catch (fetchErr) {
      console.warn('Could not load plan context for note generator:', fetchErr.message);
    }
  } else if (customContext) {
    examName = customContext.examName || examName;
    academicLevel = customContext.academicLevel || academicLevel;
    examFormat = customContext.targetFormat || examFormat;
    if (customContext.targetDepth) {
      resolvedDifficulty = customContext.targetDepth;
    }
  }

  // 2. Resolve Pedagogical Archetype & Depth Directive
  const depthDirective = deriveDepthDirective(subTopicText, resolvedMinutes, resolvedDifficulty);
  const archetype = resolveArchetype({
    subTopicType: resolvedSubTopicType,
    subTopicText,
    examFormat,
    archetypeOverride: customContext?.archetypeOverride,
  });

  // 3. Phase 1: Deep Pedagogical Outline (Free-form Markdown)
  onStatus?.({
    stage: 'Pedagogical Outline',
    message: `Designing deep ${ARCHETYPES[archetype]?.label || archetype} outline (${outlineModel})...`,
  });

  const outlinePrompt = buildOutlinePrompt({
    examName,
    academicLevel,
    examFormat,
    dayTopic,
    cleanSubTopic,
    archetype,
    depthDirective,
    previousContext,
    strategicContext,
  });

  const rawOutlineMarkdown = await generateText({
    accessToken: token,
    model: outlineModel,
    prompt: outlinePrompt,
    signal,
  });

  if (!rawOutlineMarkdown || rawOutlineMarkdown.trim().length < 60) {
    throw new Error('The AI failed to generate a valid pedagogical outline. Please try again.');
  }

  const sections = splitOutlineIntoSections(rawOutlineMarkdown);
  const shouldChunk =
    sections.length >= 5 &&
    (depthDirective === 'STANDARD' ||
      depthDirective === 'DEEP' ||
      depthDirective === 'EXHAUSTIVE' ||
      depthDirective === 'COMPREHENSIVE');

  let fullNotesMarkdown = '';

  if (shouldChunk) {
    // Phase 2: Chunked Multi-Pass Authoring
    const splitIndex = Math.ceil(sections.length / 2);
    const part1Outline = sections
      .slice(0, splitIndex)
      .map((s) => s.lines.join('\n'))
      .join('\n\n');
    const part2Outline = sections
      .slice(splitIndex)
      .map((s) => s.lines.join('\n'))
      .join('\n\n');

    onStatus?.({
      stage: 'Textbook Authoring (Part 1/2)',
      message: `Authoring deep textbook chapter: Part 1 (${authorModel})...`,
    });

    const part1Prompt = buildAuthorPrompt({
      examName,
      academicLevel,
      examFormat,
      dayTopic,
      cleanSubTopic,
      archetype,
      depthDirective,
      previousContext,
      chapterOutline: part1Outline,
      chunkMode: 'PART_1',
    });

    const part1Markdown = await generateText({
      accessToken: token,
      model: authorModel,
      prompt: part1Prompt,
      signal,
    });

    if (!part1Markdown || part1Markdown.trim().length < 150) {
      throw new Error('The AI failed to generate Part 1 of the note. Please try again.');
    }

    const snippet = part1Markdown.trim().slice(-400);

    onStatus?.({
      stage: 'Textbook Authoring (Part 2/2)',
      message: `Authoring deep textbook chapter: Part 2 (${authorModel})...`,
    });

    const part2Prompt = buildAuthorPrompt({
      examName,
      academicLevel,
      examFormat,
      dayTopic,
      cleanSubTopic,
      archetype,
      depthDirective,
      previousContext,
      chapterOutline: part2Outline,
      chunkMode: 'PART_2',
      continuationSnippet: snippet,
    });

    const part2Markdown = await generateText({
      accessToken: token,
      model: authorModel,
      prompt: part2Prompt,
      signal,
    });

    if (!part2Markdown || part2Markdown.trim().length < 150) {
      throw new Error('The AI failed to generate Part 2 of the note. Please try again.');
    }

    fullNotesMarkdown = `${part1Markdown.trim()}\n\n${part2Markdown.trim()}`;
  } else {
    // Single-Pass Authoring
    onStatus?.({
      stage: 'Textbook Authoring',
      message: `Authoring deep textbook chapter (${authorModel})...`,
    });

    const authorPrompt = buildAuthorPrompt({
      examName,
      academicLevel,
      examFormat,
      dayTopic,
      cleanSubTopic,
      archetype,
      depthDirective,
      previousContext,
      chapterOutline: rawOutlineMarkdown,
      chunkMode: 'SINGLE',
    });

    fullNotesMarkdown = await generateText({
      accessToken: token,
      model: authorModel,
      prompt: authorPrompt,
      signal,
    });

    if (!fullNotesMarkdown || fullNotesMarkdown.trim().length < 150) {
      throw new Error('The AI failed to generate a sufficiently detailed note. Please try again.');
    }
  }

  // 4. Normalization
  const normalizedMarkdown = normalizeNoteMarkdown(fullNotesMarkdown);

  // 5. Persistence
  if (isGuest || !planTopicId) {
    return {
      note: {
        id: `guest_${Date.now()}`,
        plan_topic_id: planTopicId || null,
        sub_topic_text: subTopicText,
        notes_markdown: normalizedMarkdown,
        created_at: new Date().toISOString(),
      },
    };
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) {
    throw new Error('Sign in required to save study notes.');
  }

  const { data: savedNote, error: saveError } = await supabase
    .from('generated_notes')
    .upsert(
      {
        user_id: userId,
        plan_topic_id: planTopicId,
        sub_topic_text: subTopicText,
        notes_markdown: normalizedMarkdown,
      },
      { onConflict: 'plan_topic_id, sub_topic_text' }
    )
    .select()
    .single();

  if (saveError) {
    throw new Error(`Failed to save note: ${saveError.message}`);
  }

  return { note: savedNote };
}

// =============================================================================
// 7. STANDALONE CUSTOM NOTE GENERATOR
// =============================================================================

/**
 * Generates a standalone custom study note independent from any study plan.
 *
 * @param {Object} params
 * @param {string} params.topicText
 * @param {string} [params.examName]
 * @param {string} [params.academicLevel]
 * @param {string} [params.targetFormat]
 * @param {string} [params.targetDepth]
 * @param {string} [params.archetypeOverride]
 * @param {string} [params.customInstructions]
 * @param {(status: string|Object) => void} [params.onStatus]
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<{ note: Object }>}
 */
export async function generateCustomNoteBYOK({
  topicText,
  examName = 'Academic Self-Study',
  academicLevel = 'Undergraduate',
  targetFormat = 'Comprehensive',
  targetDepth = 'STANDARD',
  archetypeOverride,
  customInstructions = '',
  onStatus,
  signal,
}) {
  const token = await ensureByokConnected();

  const authorModel = await resolveModelForTask('notesAuthorModel', { accessToken: token });

  onStatus?.({
    stage: 'Authoring',
    message: `Authoring custom note for "${topicText}" (${authorModel})...`,
  });

  return generateNoteBYOK({
    planTopicId: null,
    subTopicText: topicText,
    examName,
    dayTopic: topicText,
    isGuest: false,
    customContext: {
      examName,
      academicLevel,
      targetFormat,
      targetDepth,
      archetypeOverride,
      customPromptInstructions: customInstructions,
    },
    onStatus,
    signal,
  });
}

// =============================================================================
// 8. BULK GENERATION PIPELINE
// =============================================================================

/**
 * Sequentially generates notes for multiple selected subtopics using user's ChatGPT BYOK quota.
 *
 * @param {Array<{ plan_topic_id: number|string, sub_topic_text: string, exam_name: string, day_topic: string }>} topics
 * @param {(info: { completed: number, total: number, current: string, note?: Object, error?: Error }) => void} [onProgress]
 * @returns {Promise<Array<Object>>}
 */
export async function bulkGenerateNotesBYOK(topics, onProgress) {
  await ensureByokConnected();
  const createdNotes = [];

  for (let i = 0; i < topics.length; i += 1) {
    const t = topics[i];
    try {
      const { note } = await generateNoteBYOK({
        planTopicId: t.plan_topic_id,
        subTopicText: t.sub_topic_text,
        examName: t.exam_name,
        dayTopic: t.day_topic,
      });
      createdNotes.push(note);
      onProgress?.({
        completed: i + 1,
        total: topics.length,
        current: t.sub_topic_text,
        note,
      });
    } catch (err) {
      onProgress?.({
        completed: i + 1,
        total: topics.length,
        current: t.sub_topic_text,
        error: err,
      });
      if (err?.isUsageLimit || err?.code === 'BYOK_NOT_CONNECTED') {
        throw err;
      }
    }
  }

  return createdNotes;
}
