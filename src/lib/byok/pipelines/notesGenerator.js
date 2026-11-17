// src/lib/byok/pipelines/notesGenerator.js
/**
 * KalPad Notes Generation Engine v3.1: Scope-Guarded & Dynamic AI-Calibrated System
 *
 * Built on the "Teach Like You Mean It, Respect the Curriculum Horizon" philosophy:
 *   - Bidirectional Plan Horizon: AI is aware of past mastered topics AND upcoming topics (strict scope fence).
 *     Guarantees the note never bleeds into future curriculum items or turns into a 26-page dissertation.
 *   - Dynamic Length Calibration: NO hardcoded word floors or ceilings. The AI dynamically calibrates
 *     the depth and length to the allocated study minutes, specific subtopic prompt, and curriculum position.
 *   - High-Speed Parallel Chunking: If an outline is genuinely extensive (>= 6 sections), Part 1 and Part 2
 *     stream in parallel via Promise.all, cutting latency from ~75s down to ~18-22s.
 *   - Anti-Wall-of-Text Visual Design: 💡 Intuition & Mental Model, ⚠️ Common Exam Trap, 🎯 30s Examiner Answer.
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
// 2. DEPTH DIRECTIVES (QUALITATIVE GUIDANCE - NO RIGID WORD CAPS/FLOORS)
// =============================================================================

export const DEPTH_GUIDE = {
  FOCUSED: {
    level: 'FOCUSED',
    directive:
      'FOCUSED — High-yield, targeted coverage. Foundational definitions, core intuition, key governing formulas, and 1 concrete worked example. Strictly scoped, zero unnecessary digressions.',
  },
  ESSENTIAL: {
    // Backward-compatible alias
    level: 'FOCUSED',
    directive:
      'FOCUSED — High-yield, targeted coverage. Foundational definitions, core intuition, key governing formulas, and 1 concrete worked example. Strictly scoped, zero unnecessary digressions.',
  },
  STANDARD: {
    level: 'STANDARD',
    directive:
      'STANDARD — Comprehensive subtopic mastery. Intuitive mental model, full step-by-step explanation or derivation, 1-2 worked examples, exam traps, and active recall.',
  },
  DEEP: {
    level: 'DEEP',
    directive:
      'DEEP — Exhaustive academic treatment. Axioms, full step-by-step mathematical or algorithmic derivations, graded examples, boundary cases, exam traps, and active recall.',
  },
  COMPREHENSIVE: {
    // Backward-compatible alias
    level: 'DEEP',
    directive:
      'DEEP — Exhaustive academic treatment. Axioms, full step-by-step mathematical or algorithmic derivations, graded examples, boundary cases, exam traps, and active recall.',
  },
  EXHAUSTIVE: {
    level: 'EXHAUSTIVE',
    directive:
      'EXHAUSTIVE — Masterclass treatment for extensive capstone topics. Foundational axioms, rigorous proofs, comprehensive worked problems, and complete self-tests.',
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

export function extractAllocatedMinutes(rawText = '', explicitMinutes = null) {
  if (typeof explicitMinutes === 'number' && explicitMinutes > 0) {
    return explicitMinutes;
  }
  const match = String(rawText).match(
    /^\s*\(\s*([\d.]+)\s*(h|hr|hrs|hour|hours|min|mins|minute|minutes)\s*\)/i
  );
  if (match) {
    return match[2].toLowerCase().startsWith('h')
      ? Math.round(parseFloat(match[1]) * 60)
      : Math.round(parseFloat(match[1]));
  }
  return null;
}

export function deriveDepthDirective(rawText = '', allocatedMinutes = null, difficulty = null) {
  const minutes = extractAllocatedMinutes(rawText, allocatedMinutes);
  if (minutes !== null) {
    if (minutes <= 25) return 'FOCUSED';
    if (minutes <= 50) return 'STANDARD';
    if (minutes <= 75) return 'DEEP';
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
  upcomingContext,
  positionContext,
  allocatedMinutes,
  strategicContext,
}) {
  const depthConfig = DEPTH_GUIDE[depthDirective] || DEPTH_GUIDE.STANDARD;
  const archetypeConfig = ARCHETYPES[archetype] || ARCHETYPES.CONCEPT_MASTER;

  return `You are a world-class academic curriculum architect and senior university professor.
Your task is to create a focused, high-clarity pedagogical Markdown outline for a self-contained study chapter on "${cleanSubTopic}".

CONTEXT:
- Target Exam: "${examName}"
- Academic Level: "${academicLevel || 'Standard University'}"
- Target Exam Format: "${examFormat || 'Comprehensive Theory & Practice'}"
- Primary Chapter / Topic: "${dayTopic}"
- Sub-Topic to Master: "${cleanSubTopic}"
${positionContext ? `- Curriculum Position: ${positionContext}` : ''}
${allocatedMinutes ? `- Allocated Study Time: ${allocatedMinutes} minutes` : ''}
- Tone & Archetype Flavor: ${archetypeConfig.label} (${archetypeConfig.focus})
- Pedagogical Focus: ${depthConfig.directive}
- Prerequisites Already Mastered: [${previousContext || 'Foundational Basics'}]
${upcomingContext ? `- UPCOMING TOPICS IN THIS STUDY PLAN (STRICT SCOPE FENCE): [${upcomingContext}]` : ''}
${strategicContext ? `- Strategic Context: ${JSON.stringify(strategicContext)}` : ''}

${archetypeConfig.toneHint}

CRITICAL SCOPE FENCE & DYNAMIC LENGTH DIRECTIVES:
1. STRICT SCOPE FENCE (DO NOT BLEED INTO FUTURE TOPICS):
   ${
     upcomingContext
       ? `The upcoming topics [${upcomingContext}] have their own dedicated notes later in the plan.
   DO NOT pre-teach, derive, or solve problems belonging to those future topics. Keep this note strictly confined to "${cleanSubTopic}".`
       : `Focus exclusively on "${cleanSubTopic}". Do not digress into unrelated topics.`
   }
2. DYNAMIC LENGTH CALIBRATION:
   - Match the outline's breadth directly to the allocated study time (${allocatedMinutes || 'standard'} minutes).
   - A 20-30 min subtopic needs 3-4 tight, high-yield sections.
   - A 40-50 min subtopic needs 4-5 well-structured sections covering intuition, formulation/derivation, and a worked example.
   - Avoid creating an excessive number of sections. Do not overcomplicate or turn a single subtopic into an entire university course.
3. GROUNDED IN EXAM REALITY:
   - Teach at the exact level of ${examName} (${academicLevel || 'University'}).
   - Focus on what examiners look for to award full marks: clear steps, key formulas, correct units, and common misconceptions.

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
  upcomingContext,
  positionContext,
  allocatedMinutes,
  chapterOutline,
  chunkMode = 'SINGLE', // 'SINGLE' | 'PART_1' | 'PART_2'
  part1HeadingsSummary = '',
}) {
  const depthConfig = DEPTH_GUIDE[depthDirective] || DEPTH_GUIDE.STANDARD;
  const archetypeConfig = ARCHETYPES[archetype] || ARCHETYPES.CONCEPT_MASTER;

  let chunkInstructions = '';
  if (chunkMode === 'PART_1') {
    chunkInstructions = `
CHUNK DIRECTIVE (PART 1 OF 2 - PARALLEL AUTHORING):
You are authoring PART 1 of this master study note in parallel.
- Thoroughly write out the foundational theory, principles, and derivations in your assigned outline below.
- Stop cleanly after your assigned sections. Do NOT add conclusion summaries or active recall self-tests.
`;
  } else if (chunkMode === 'PART_2') {
    chunkInstructions = `
CHUNK DIRECTIVE (PART 2 OF 2 - PARALLEL AUTHORING):
You are authoring PART 2 of this master study note in parallel.
Part 1 authors the foundational concepts (${part1HeadingsSummary || 'preceding sections'}).
- Begin directly with your assigned sections in the outline below without repeating Part 1 content.
- Thoroughly write out the applied sections, worked examples, common exam traps, and connections.
- Conclude with the interactive Check Your Understanding (Active Recall with <details> foldables) section at the end of Part 2.
`;
  }

  return `You are a world-class academic author and master private tutor. Your writing is clear, technically precise, intuitive, and grounded in exam reality.
Your mission is to author a complete, self-contained study note on "${cleanSubTopic}".
When the student finishes reading, they must understand the subtopic in its ENTIRETY—everything needed for ${examName}, not more, not less.

CONTEXT:
- Target Exam: "${examName}" (${academicLevel || 'University'})
- Chapter: "${dayTopic}"
- Sub-Topic to Master: "${cleanSubTopic}"
${positionContext ? `- Curriculum Position: ${positionContext}` : ''}
${allocatedMinutes ? `- Allocated Study Time: ${allocatedMinutes} minutes` : ''}
- Archetype & Tone Focus: ${archetypeConfig.label}
- Pedagogical Focus: ${depthConfig.directive}
- Prerequisites (Known axioms — build forward from them, do not re-explain): [${previousContext || 'None'}]
${upcomingContext ? `- UPCOMING TOPICS (STRICT SCOPE FENCE): [${upcomingContext}]` : ''}
${chunkInstructions}

OUTLINE TO EXPAND INTO THE NOTE:
---
${chapterOutline}
---

PEDAGOGICAL & VISUAL WRITING RULES:

1. RESPECT THE SCOPE FENCE & TIME BUDGET (DO NOT OVERCOMPLICATE):
   ${
     upcomingContext
       ? `The upcoming topics [${upcomingContext}] will each have their own dedicated notes later in the plan.
   DO NOT pre-teach or bleed into those future topics! Focus solely on mastering "${cleanSubTopic}".`
       : `Focus solely on mastering "${cleanSubTopic}".`
   }
   - The student has allocated ${allocatedMinutes || 'standard'} minutes to study this note.
   - Do NOT turn this into a 26-page dissertation. Write with high signal-to-noise ratio.
   - Every paragraph and equation must serve the student's exam mastery. Avoid PhD-level abstractions or decorative mathematical padding.

2. TEACH WITH INTUITION FIRST:
   - For every major formula or concept, explain the physical or intuitive "WHY" before presenting the symbols.
   - Never say "similarly, it can be shown that..." or "left as an exercise to the reader". If a step is part of this subtopic, show it clearly!
   - For programming or simulation topics (e.g., VHDL, Verilog, Python, C++): provide complete, syntactically valid code blocks with line-by-line commentary.

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
    ? '7. CLEAN ENDING FOR PART 1: Conclude Part 1 cleanly after its assigned sections. Do not add Check Your Understanding questions.'
    : `7. ACTIVE RECALL CHECKPOINTS (FOLDABLE):
   End the chapter with 2 to 4 progressive self-test questions using native HTML <details> tags so the student can test themselves before inspecting the answer:
   
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
 * Automatically inherits bidirectional curriculum context from Plan Generator v2 and applies parallel chunking when needed.
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
  let upcomingContext = '';
  let positionContext = '';
  let academicLevel = 'Standard University';
  let examFormat = 'Comprehensive';
  let strategicContext = null;
  let resolvedSubTopicType = subTopicType;
  let resolvedDifficulty = difficulty;
  let resolvedMinutes = extractAllocatedMinutes(subTopicText, allocatedMinutes);
  let planId = null;

  // 1. Ingest Bidirectional Plan Context from Supabase if planTopicId is provided
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
            resolvedMinutes = extractAllocatedMinutes(match.text, resolvedMinutes);
          }
        }

        // Fetch ALL topics across the plan to construct both:
        // 1. previousContext (already mastered axioms)
        // 2. upcomingContext (strict scope fence to prevent scope bleed)
        const { data: allPlanTopics } = await supabase
          .from('plan_topics')
          .select('id, day, topic_name, sub_topics')
          .eq('plan_id', planId)
          .order('day', { ascending: true });

        if (allPlanTopics && Array.isArray(allPlanTopics)) {
          const allSubTopicsFlattened = allPlanTopics.flatMap((d) =>
            (d.sub_topics || []).map((st) => ({
              cleanText: stripTimePrefix(st.text || ''),
              rawText: st.text || '',
              day: d.day,
              topicName: d.topic_name,
            }))
          );

          const currentIndex = allSubTopicsFlattened.findIndex(
            (st) =>
              st.cleanText.toLowerCase() === cleanSubTopic.toLowerCase() ||
              st.rawText.toLowerCase().includes(cleanSubTopic.toLowerCase())
          );

          if (currentIndex !== -1) {
            // Previous 2-3 topics
            const prev = allSubTopicsFlattened.slice(Math.max(0, currentIndex - 3), currentIndex);
            if (prev.length > 0) {
              previousContext = prev.map((p) => p.cleanText).join(' → ');
            }

            // Next 2-3 upcoming topics (the scope fence)
            const next = allSubTopicsFlattened.slice(currentIndex + 1, currentIndex + 4);
            if (next.length > 0) {
              upcomingContext = next.map((n) => n.cleanText).join(' → ');
            }

            positionContext = `Subtopic ${currentIndex + 1} of ${allSubTopicsFlattened.length} in overall curriculum (Day ${topicData.day}: ${dayTopic})`;
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

  // 3. Phase 1: Deep Pedagogical Outline (Free-form Markdown with Scope Fence)
  onStatus?.({
    stage: 'Pedagogical Outline',
    message: `Structuring ${ARCHETYPES[archetype]?.label || archetype} roadmap (${outlineModel})...`,
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
    upcomingContext,
    positionContext,
    allocatedMinutes: resolvedMinutes,
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
  const shouldChunkParallel = sections.length >= 6;

  let fullNotesMarkdown = '';

  if (shouldChunkParallel) {
    // Phase 2: High-Speed Parallel Chunked Authoring via Promise.all
    const splitIndex = Math.ceil(sections.length / 2);
    const part1Outline = sections
      .slice(0, splitIndex)
      .map((s) => s.lines.join('\n'))
      .join('\n\n');
    const part2Outline = sections
      .slice(splitIndex)
      .map((s) => s.lines.join('\n'))
      .join('\n\n');
    const part1Headings = sections
      .slice(0, splitIndex)
      .map((s) => s.heading)
      .join(', ');

    onStatus?.({
      stage: 'Textbook Authoring (Parallel)',
      message: `Authoring comprehensive chapter in parallel (${authorModel})...`,
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
      upcomingContext,
      positionContext,
      allocatedMinutes: resolvedMinutes,
      chapterOutline: part1Outline,
      chunkMode: 'PART_1',
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
      upcomingContext,
      positionContext,
      allocatedMinutes: resolvedMinutes,
      chapterOutline: part2Outline,
      chunkMode: 'PART_2',
      part1HeadingsSummary: part1Headings,
    });

    // Execute both halves simultaneously in parallel
    const [part1Markdown, part2Markdown] = await Promise.all([
      generateText({
        accessToken: token,
        model: authorModel,
        prompt: part1Prompt,
        signal,
      }),
      generateText({
        accessToken: token,
        model: authorModel,
        prompt: part2Prompt,
        signal,
      }),
    ]);

    if (!part1Markdown || part1Markdown.trim().length < 100) {
      throw new Error('The AI failed to generate Part 1 of the note. Please try again.');
    }
    if (!part2Markdown || part2Markdown.trim().length < 100) {
      throw new Error('The AI failed to generate Part 2 of the note. Please try again.');
    }

    fullNotesMarkdown = `${part1Markdown.trim()}\n\n${part2Markdown.trim()}`;
  } else {
    // Single-Pass Fast Authoring (~12-15s)
    onStatus?.({
      stage: 'Textbook Authoring',
      message: `Authoring study note (${authorModel})...`,
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
      upcomingContext,
      positionContext,
      allocatedMinutes: resolvedMinutes,
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
