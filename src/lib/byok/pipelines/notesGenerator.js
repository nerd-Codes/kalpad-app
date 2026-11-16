// src/lib/byok/pipelines/notesGenerator.js
/**
 * KalPad Notes Generation Engine v2: The Pedagogical Masterpiece System
 *
 * Fully integrated with Plan Generation Engine v2:
 *   - Ingests academic level, exam format, high-yield topics, and derivation warnings.
 *   - Dynamically activates 5 Pedagogical Archetypes:
 *       1. CONCEPT_MASTER: Mental models, formal axioms, comparison matrices.
 *       2. DERIVATION_DEEP_DIVE: Step-by-step annotated proofs, exam loss warnings, boundary checks.
 *       3. PROBLEM_SOLVING: Universal 4-step algorithm, 3 graded worked PYQs.
 *       4. VIVA_DRILL: 30-second oral answers, cross-questioning traps, rapid-fire drills.
 *       5. LAB_PROCEDURE: Apparatus setup, execution protocols, observation tables, error analysis.
 *   - Anti-Wall-of-Text Visual Design System:
 *       💡 Mental Models, ⚠️ Exam Traps, 🎯 30s Examiner Answers, ⚡ Symbol Glossaries.
 *   - Unbreakable KaTeX ($...$ inline, $$...$$ display with blank lines).
 *   - Foldable Active Recall Self-Tests (<details><summary>Reveal Solution</summary></details>).
 *   - Unified engine supporting both Plan-Attached Subtopics & Standalone Custom Notes.
 */

import supabase from '../../supabaseClient.js';
import { ensureByokConnected, generateText, resolveModelForTask } from '../openai.js';
import { parseAiJson, sanitizeDoubleEscapedLatex } from '../jsonSanitizer.js';
import { preprocessMathBlocks } from '../../noteMarkdown.js';

// =============================================================================
// 1. ARCHETYPES & DEPTH SPECIFICATIONS
// =============================================================================

export const ARCHETYPES = {
  CONCEPT_MASTER: {
    id: 'CONCEPT_MASTER',
    label: 'Concept Master',
    focus: 'Intuitive mental models, formal definitions, comparison matrices, and real-world grounding.',
  },
  DERIVATION_DEEP_DIVE: {
    id: 'DERIVATION_DEEP_DIVE',
    label: 'Derivation Deep-Dive',
    focus: 'Physical axioms, explicit assumptions, line-by-line annotated algebraic proof, exam mistake alerts, and boundary analysis.',
  },
  PROBLEM_SOLVING: {
    id: 'PROBLEM_SOLVING',
    label: 'Problem-Solving Blueprint',
    focus: 'Question pattern recognition, universal 4-step algorithm, 3 graded worked examples (Standard, Tricky, Curveball), and calculation pitfalls.',
  },
  VIVA_DRILL: {
    id: 'VIVA_DRILL',
    label: 'Viva Oral Combat Kit',
    focus: '30-second oral answers, cross-questioning traps, counter-intuitive edge cases, and rapid-fire drills.',
  },
  LAB_PROCEDURE: {
    id: 'LAB_PROCEDURE',
    label: 'Lab & Procedure Manual',
    focus: 'Apparatus setup, procedural protocol, sample observation tables, error analysis, and precautions.',
  },
};

export const DEPTH_GUIDE = {
  ESSENTIAL: {
    level: 'ESSENTIAL',
    targetWords: '800–1,200 words',
    directive:
      'ESSENTIAL — Razor-sharp, high-yield focus. Cover core definitions, 1 worked problem/derivation, 2 exam traps, and 2 active recall questions. Zero digressions.',
  },
  STANDARD: {
    level: 'STANDARD',
    targetWords: '1,500–2,200 words',
    directive:
      'STANDARD — Complete pedagogical treatment. Intuitive mental model, full derivations, 2 graded worked examples, 3 exam traps, and 3 active recall questions.',
  },
  COMPREHENSIVE: {
    level: 'COMPREHENSIVE',
    targetWords: '2,600–3,800 words',
    directive:
      'COMPREHENSIVE — Exhaustive academic mastery. Multi-stage proofs, boundary conditions, 3 graded problems (Standard, Tricky, Curveball), edge cases, and 4 active recall questions.',
  },
};

// =============================================================================
// 2. PEDAGOGICAL RESOLVERS & PARSERS
// =============================================================================

export function stripTimePrefix(text = '') {
  return String(text)
    .replace(/^\s*\(\s*[\d.]+\s*(?:h|hr|hrs|hour|hours|min|mins|minute|minutes)\s*\)\s*/i, '')
    .trim();
}

export function deriveDepthDirective(rawText = '', allocatedMinutes = null, difficulty = null) {
  if (typeof allocatedMinutes === 'number' && allocatedMinutes > 0) {
    if (allocatedMinutes <= 35) return 'ESSENTIAL';
    if (allocatedMinutes <= 75) return 'STANDARD';
    return 'COMPREHENSIVE';
  }

  const match = String(rawText).match(
    /^\s*\(\s*([\d.]+)\s*(h|hr|hrs|hour|hours|min|mins|minute|minutes)\s*\)/i
  );

  if (match) {
    const hours = match[2].toLowerCase().startsWith('h')
      ? parseFloat(match[1])
      : parseFloat(match[1]) / 60;
    if (hours < 0.7) return 'ESSENTIAL';
    if (hours < 1.3) return 'STANDARD';
    return 'COMPREHENSIVE';
  }

  if (difficulty === 'Intense') return 'COMPREHENSIVE';
  if (difficulty === 'Easy') return 'ESSENTIAL';
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

// =============================================================================
// 3. PROMPT GENERATORS (STAGE 0, 1, 2)
// =============================================================================

function buildPersonaPrompt(examName) {
  return `You are a distinguished academic curriculum designer. Based on the exam name below, generate an authoritative persona specification that will govern the depth, tone, and rigor of study notes.

Exam: "${examName}"

Return ONLY a single valid JSON object (no markdown fences, no preamble):
{
  "academic_level": "Undergraduate Engineering | High School Senior | Competitive Aspirant | Postgraduate",
  "key_focus_areas": ["Critical concept or skill type 1", "Skill 2", "Skill 3"],
  "marking_patterns": "What examiners look for when awarding full marks (e.g. step explanations, labeled diagrams, units)",
  "writing_style": "Tone directive (e.g. Rigorous yet clear, engaging, intuitive, textbook-grade)"
}`;
}

export function buildBlueprintPrompt({
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

  return `You are a world-class academic curriculum architect designing a Pedagogical Blueprint for a definitive study note.

CONTEXT:
- Exam: "${examName}"
- Academic Level: "${academicLevel || 'Standard University'}"
- Target Exam Format: "${examFormat || 'Comprehensive'}"
- Primary Chapter / Topic: "${dayTopic}"
- Sub-Topic to Master: "${cleanSubTopic}"
- Target Pedagogical Archetype: "${archetypeConfig.label}" (${archetypeConfig.focus})
- Depth Directive: ${depthConfig.directive}
- Target Word Budget: ${depthConfig.targetWords}
- Prerequisites Already Understood: [${previousContext || 'Foundational Basics'}]
${strategicContext ? `- Strategic Context: ${JSON.stringify(strategicContext)}` : ''}

PEDAGOGICAL REQUIREMENTS:
1. ARCHETYPE ALIGNMENT:
   - If CONCEPT_MASTER: Focus on a strong intuitive mental model, clear physical/conceptual analogies, definitions, and comparison tables.
   - If DERIVATION_DEEP_DIVE: Detail governing laws, explicit assumptions, line-by-line algebraic steps with explanations, and boundary checks.
   - If PROBLEM_SOLVING: Outline a universal 4-step solution template and 2-3 graded worked problems (Standard, Tricky, Curveball).
   - If VIVA_DRILL: Provide 30-second oral answers, cross-questioning traps, and rapid-fire oral drills.
   - If LAB_PROCEDURE: Outline principle, apparatus specifications, execution protocol, observation table format, and error analysis.

2. ACTIVE RECALL CHECKPOINTS:
   - Formulate 2 to 4 progressive self-test questions (Recall, Conceptual, Application/Derivation) with full step-by-step solutions for interactive foldables.

Return ONLY a single valid JSON object with this exact structure (no markdown fences, no preamble):
{
  "mental_model_hook": "A 1-2 sentence intuitive analogy that unlocks the core concept before formal theory",
  "formal_definitions": [
    { "term": "Term Name", "definition": "Rigorous definition" }
  ],
  "governing_equations": [
    {
      "equation": "LaTeX formula (e.g. \\\\Delta U = Q - W)",
      "symbol_glossary": ["$Q$: heat added to system (J)", "$W$: work done by system (J)"]
    }
  ],
  "pedagogical_sections": [
    {
      "section_title": "Section Heading",
      "core_instruction": "What specifically to teach and emphasize here",
      "misconception_flag": "Common error students make at this exact point",
      "example_needed": "What type of worked example or comparison table to include"
    }
  ],
  "exam_traps": [
    {
      "common_mistake": "The exact mistake that causes 70% of students to lose marks",
      "correction": "The correct rule or counter-measure"
    }
  ],
  "worked_examples": [
    {
      "tier": "Standard | Tricky | Curveball",
      "problem_statement": "Specific problem scenario with realistic parameters",
      "solution_strategy": "Key insight needed before calculating",
      "key_takeaway": "What this example teaches about the general concept"
    }
  ],
  "active_recall_checkpoints": [
    {
      "question": "Clear self-test question for the student",
      "solution_steps": "Detailed step-by-step answer"
    }
  ]
}`;
}

export function buildVisualAuthorPrompt({
  examName,
  academicLevel,
  examFormat,
  dayTopic,
  cleanSubTopic,
  archetype,
  depthDirective,
  previousContext,
  blueprint,
}) {
  const depthConfig = DEPTH_GUIDE[depthDirective] || DEPTH_GUIDE.STANDARD;
  const archetypeConfig = ARCHETYPES[archetype] || ARCHETYPES.CONCEPT_MASTER;

  return `You are a world-class academic author and master educator. Your writing sits between a brilliant university textbook and an inspiring private tutor.
Your mission is to author a complete, self-contained study note on "${cleanSubTopic}".
When the student finishes reading, they must understand the subtopic in its ENTIRETY—everything needed for their exam, not more, not less.

CONTEXT:
- Exam: "${examName}" (${academicLevel || 'University'})
- Chapter: "${dayTopic}"
- Sub-Topic: "${cleanSubTopic}"
- Archetype: ${archetypeConfig.label}
- Depth Directive: ${depthConfig.directive}
- Target Word Budget: ${depthConfig.targetWords}
- Prerequisites (Known axioms — do not re-teach): [${previousContext || 'None'}]

PEDAGOGICAL BLUEPRINT TO FOLLOW:
${JSON.stringify(blueprint, null, 2)}

WRITING & VISUAL DESIGN RULES (ANTI-WALL-OF-TEXT):

1. INTUITIVE HOOK FIRST:
   Begin with a visual callout block containing the mental model:
   > 💡 **Intuition & Mental Model:** [Explain the core concept with an intuitive physical or real-world analogy before presenting formal theory]

2. VISUAL CALLOUT CARDS:
   Punctuate the explanation with structured callout blockquotes:
   > ⚠️ **Common Exam Trap:** [The exact mistake students make in this exam and how to avoid it]
   > 🎯 **30-Second Examiner Answer:** [For definitions and viva: verbatim crisp answer that earns full marks]
   > **Definition:** [Formal academic definition with the term **bolded** on first use]

3. UNBREAKABLE KATEX MATH RULES:
   - Inline math: Use single dollar signs: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$
   - Display (block) math: Use double dollar signs with a BLANK LINE BEFORE AND AFTER:

$$
\\oint \\vec{B} \\cdot d\\vec{A} = 0
$$

   - FORBIDDEN: Never use \\\\[...\\\\] or \\\\(...\\\\). Never use {equation} or {eqnarray}.
   - Environments permitted: {align}, {aligned}, {matrix}, {pmatrix}, {bmatrix}, {cases}.
   - SYMBOL GLOSSARY MANDATORY: Immediately following every major equation, write:
     **where** $X$ = [meaning with SI unit], $Y$ = [meaning with SI unit]...

4. STRUCTURED COMPARISONS & TABLES:
   Whenever contrasting concepts, methods, or experimental setups, use clean Markdown tables.

5. GRADED WORKED EXAMPLES:
   Format worked examples with explicit step-by-step numbering:
   ### Worked Example: [Descriptive Title]
   **Problem:** [Crisp question]
   **Solution:**
   - **Step 1 (Physical Setup):** ...
   - **Step 2 (Governing Formula):** ...
   - **Step 3 (Calculation & Units):** ...
   - **Final Result:** [Boxed / Bold answer with SI unit]
   > 💡 **Key Takeaway:** [One sentence on what to remember for the exam]

6. ACTIVE RECALL CHECKPOINTS (FOLDABLE):
   End the note with 2 to 4 interactive self-test questions using native HTML <details> tags so the student can test themselves before seeing the answer:
   
   ### Check Your Understanding (Active Recall)
   
   **Q1:** [Question prompt]
   <details>
   <summary>Reveal Step-by-Step Solution</summary>
   
   [Full explanation, derivation, or calculation]
   </details>

7. AUTHORITATIVE COMPLETION:
   Write out all derivations completely without skipping steps ("similarly we can show" is forbidden).
   Do not repeat the sub-topic title as an H1 or H2 header; begin immediately with the first section.
   Write with genuine pedagogical brilliance and uncompromising rigor.`;
}

// =============================================================================
// 4. NORMALIZATION & SANITIZATION
// =============================================================================

export function normalizeNoteMarkdown(rawMarkdown = '') {
  if (!rawMarkdown) return '';

  // 1. Sanitize double-escaped LaTeX
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
// 5. CORE PIPELINE: PLAN-ATTACHED NOTE GENERATION
// =============================================================================

/**
 * Generates a study note directly in the browser using the user's connected ChatGPT BYOK quota.
 * Automatically inherits rich context from Plan Generator v2.
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

  let previousContext = 'None. This is the first topic in the study plan.';
  let examPersona = null;
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
          examPersona = studyPlan.exam_persona || null;

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

        // Match matching subtopic from sub_topics array to extract type and minute budget
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
    // Custom context override
    examName = customContext.examName || examName;
    academicLevel = customContext.academicLevel || academicLevel;
    examFormat = customContext.targetFormat || examFormat;
  }

  // 2. Resolve Pedagogical Archetype & Depth
  const depthDirective = deriveDepthDirective(subTopicText, resolvedMinutes, resolvedDifficulty);
  const archetype = resolveArchetype({
    subTopicType: resolvedSubTopicType,
    subTopicText,
    examFormat,
    archetypeOverride: customContext?.archetypeOverride,
  });

  // 3. Stage 1: Pedagogical Blueprinting
  onStatus?.({
    stage: 'Pedagogical Outline',
    message: `Designing ${ARCHETYPES[archetype]?.label || archetype} blueprint (${outlineModel})...`,
  });

  const blueprintPrompt = buildBlueprintPrompt({
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

  const rawBlueprint = await generateText({
    accessToken: token,
    model: outlineModel,
    prompt: blueprintPrompt,
    signal,
  });

  let blueprint = null;
  try {
    blueprint = parseAiJson(rawBlueprint);
  } catch (_) {
    // Graceful fallback blueprint if JSON parse fails
    blueprint = {
      mental_model_hook: `Mastering ${cleanSubTopic} unlocks fundamental exam questions in ${examName}.`,
      formal_definitions: [{ term: cleanSubTopic, definition: `Core principle of ${dayTopic}.` }],
      governing_equations: [],
      pedagogical_sections: [
        {
          section_title: 'Core Fundamentals',
          core_instruction: 'Explain foundational mechanism with worked math.',
          misconception_flag: 'Confusing definitions with boundary cases.',
          example_needed: 'Step-by-step standard problem.',
        },
      ],
      exam_traps: [
        {
          common_mistake: 'Failing to state assumptions or include proper units.',
          correction: 'State all assumptions and check SI units.',
        },
      ],
      worked_examples: [],
      active_recall_checkpoints: [
        {
          question: `Explain the physical significance of ${cleanSubTopic}.`,
          solution_steps: `State the governing law, write down the formula, and verify with a boundary condition.`,
        },
      ],
    };
  }

  // 4. Stage 2: Master Visual Authoring
  onStatus?.({
    stage: 'Textbook Authoring',
    message: `Authoring visual ${ARCHETYPES[archetype]?.label || 'master'} note (${authorModel})...`,
  });

  const authorPrompt = buildVisualAuthorPrompt({
    examName,
    academicLevel,
    examFormat,
    dayTopic,
    cleanSubTopic,
    archetype,
    depthDirective,
    previousContext,
    blueprint,
  });

  const rawAuthorMarkdown = await generateText({
    accessToken: token,
    model: authorModel,
    prompt: authorPrompt,
    signal,
  });

  if (!rawAuthorMarkdown || rawAuthorMarkdown.trim().length < 150) {
    throw new Error('The AI failed to generate a sufficiently detailed note. Please try again.');
  }

  const normalizedMarkdown = normalizeNoteMarkdown(rawAuthorMarkdown);

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
// 6. STANDALONE CUSTOM NOTE GENERATOR
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
// 7. BULK GENERATION PIPELINE
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
