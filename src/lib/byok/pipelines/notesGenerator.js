// src/lib/byok/pipelines/notesGenerator.js
/**
 * Client-side 3-Stage Notes Generation Pipeline powered by ChatGPT BYOK quota.
 * Granular Model Routing:
 *   - Stage 0: Exam Persona       -> modelPreferences.notesPersonaModel
 *   - Stage 1: Pedagogical Outline -> modelPreferences.notesOutlineModel
 *   - Stage 2: Textbook Authoring  -> modelPreferences.notesAuthorModel
 */

import supabase from '../../supabaseClient.js';
import { ensureByokConnected, generateText, resolveModelForTask } from '../openai.js';
import { parseAiJson, sanitizeDoubleEscapedLatex } from '../jsonSanitizer.js';

export const DEPTH_GUIDE = {
  ESSENTIAL:
    'ESSENTIAL — Be concise and focused. Cover core concepts only. No digressions. Target ~700–1000 words.',
  STANDARD:
    'STANDARD — Full treatment with worked examples and derivations. Target ~1200–2000 words.',
  COMPREHENSIVE:
    'COMPREHENSIVE — Exhaustive coverage. Full derivations, multiple examples, edge cases. Target ~2500–3500 words.',
};

export function stripTimePrefix(text = '') {
  return String(text)
    .replace(/^\s*\(\s*[\d.]+\s*(?:h|hr|hrs|hour|hours|min|mins|minute|minutes)\s*\)\s*/i, '')
    .trim();
}

export function deriveDepthDirective(rawText = '') {
  const match = String(rawText).match(
    /^\s*\(\s*([\d.]+)\s*(h|hr|hrs|hour|hours|min|mins|minute|minutes)\s*\)/i
  );
  if (!match) return 'STANDARD';
  const hours = match[2].toLowerCase().startsWith('h')
    ? parseFloat(match[1])
    : parseFloat(match[1]) / 60;
  if (hours < 0.75) return 'ESSENTIAL';
  if (hours < 1.25) return 'STANDARD';
  return 'COMPREHENSIVE';
}

export function buildPersonaPrompt(examName) {
  return `You are an expert academic analyst. Based on the exam name below, generate a concise persona document that will guide another AI in writing study notes.

Exam: "${examName}"

Return ONLY a single valid JSON object (no markdown fences):
{
  "audience_level": "Short description of target audience",
  "key_focus_areas": ["Critical concept or skill type 1", "..."],
  "writing_style": "Tone directive for writing"
}

Examples:
- GATE Electronics -> audience_level: "Post-graduate engineering, highly competitive", key_focus_areas: ["Problem-solving", "Core theorems", "Numerical accuracy"], writing_style: "Dense, technical, textbook-level"
- CBSE Class 12 -> audience_level: "High school senior", key_focus_areas: ["Key definitions", "Step-by-step derivations", "Standard problems"], writing_style: "Clear, simple, use analogies"`;
}

export function buildOutlinePrompt({
  examName,
  dayTopic,
  cleanSubTopic,
  previousContext,
  examPersona,
  depthDirective,
}) {
  return `You are an expert curriculum designer. Create a detailed pedagogical outline for a self-contained study chapter.

CONTEXT:
- Exam: "${examName}"
- Chapter: "${dayTopic}"
- Sub-Topic: "${cleanSubTopic}"
- Previously Learned: [${previousContext}]
- Depth: ${DEPTH_GUIDE[depthDirective]}

Exam Persona: ${JSON.stringify(examPersona)}

NARRATIVE FLOW: The student just finished the "Previously Learned" topics. Do not re-explain them — build forward from them explicitly.

OUTLINE REQUIREMENTS:
- Follow the depth directive strictly.
- Include an Introduction, Core Principles, Key Formulas/Derivations (if applicable), Worked Examples, and a Summary.
- For each major section, add a one-line annotation in brackets:
  [MISCONCEPTION: the specific wrong intuition students have here, if any]
  [EXAMPLE NEEDED: the type of worked example that would best illustrate this]
- Structure flows from foundational to advanced. Each section must set up the next.
- Output ONLY a structured Markdown outline (### for sections). This goes to an Author AI — clarity and logical flow are everything.`;
}

export function buildAuthorPrompt({
  examName,
  dayTopic,
  cleanSubTopic,
  previousContext,
  examPersona,
  depthDirective,
  chapterOutline,
}) {
  return `You are a world-class academic author. Your writing sits between a university textbook and a brilliant private tutor — technically precise, yet clear enough that a student can fully understand the topic from this note alone. Write with authority and genuine insight.

CONTEXT:
- Exam: "${examName}"
- Chapter: "${dayTopic}"
- Sub-Topic: "${cleanSubTopic}"
- Prerequisites (already known — use as axioms, do not re-teach): [${previousContext}]
- Depth: ${DEPTH_GUIDE[depthDirective]}

Exam Persona (your primary filter for tone, depth, and examples):
${JSON.stringify(examPersona)}

OUTLINE TO FOLLOW:
---
${chapterOutline}
---

WRITING INSTRUCTIONS:

1. FOLLOW THE OUTLINE — cover every section. Do not deviate from its structure.

2. DEPTH — honour the depth directive above. ESSENTIAL = tight prose, no digressions.
   STANDARD = full explanation with one worked example per core concept.
   COMPREHENSIVE = multiple examples, full derivations, edge cases, nothing left implicit.

3. PREREQUISITES — begin with a one-sentence bridge: "Building on [previous concept], we now..."
   Never re-explain prerequisites. Treat them as axioms.

4. THEORY FIRST — for each concept, explain the physical or mathematical intuition BEFORE
   presenting the formula. A student should understand WHY the formula takes the form it does.

5. MISCONCEPTIONS — wherever the outline flags [MISCONCEPTION: ...], include:
   > ⚠️ **Common Misconception:** [the wrong belief]
   > **Correction:** [the right statement in one clear sentence]
   This is the single highest-value element for exam performance.

6. DEFINITIONS — every new term on first use gets a definition blockquote:
   > **Definition:** [precise formal definition]
   Also **bold** the term at its first occurrence in prose.

7. EQUATIONS — after any equation with 3+ symbols, immediately follow with:
   **where** $X$ = [meaning] ([unit]), $Y$ = [meaning], ...
   Never assume symbols are self-evident.

8. WORKED EXAMPLES — wherever the outline flags [EXAMPLE NEEDED: ...], include a full
   worked example in this format:
   **Example:** [Descriptive title]
   *Problem:* [Statement]
   *Solution:* Step 1 → Step 2 → ... → Final Answer
   *Key Takeaway:* [One sentence on what this reveals about the concept]

9. CHECK YOUR UNDERSTANDING — end every note with 3 questions (ESSENTIAL: 2, COMPREHENSIVE: 4).
   Mix: one definition/recall, one conceptual "why", one application/numerical.
   Do not provide answers — the student must work through these.

10. CONNECTIONS — final section before Check Your Understanding:
    **Builds on:** [specific prerequisite concept]
    **Unlocks:** [specific future topics this enables]
    **In ${examName}:** [how this appears in the exam — question type, common trap, marking pattern]

11. NO REDUNDANT TITLE — do not repeat the sub-topic name as a heading. Begin directly
    with the first outline section.

FORMATTING:
- Clean Markdown throughout. ### for sections, #### for subsections.
- Blockquotes for definitions and misconceptions.
- Bold for key terms on first use.

LATEX (KATEX — UNBREAKABLE):
- Inline: $...$ only. Display: $$...$$ only, with a blank line before and after.
- FORBIDDEN: \\[...\\] and \\(...\\) — KaTeX does not render them.
- Environments: ONLY {matrix} {pmatrix} {bmatrix} {Vmatrix} {vmatrix} {align} {aligned} {cases}
- FORBIDDEN environments: {equation} {eqnarray} {gather}
- Inside math: escape \\% \\_ \\& (\\& is fine inside {align})
- All brackets and braces must be correctly matched and closed.`;
}

/**
 * Generates a study note directly in the browser using user's connected ChatGPT plan quota,
 * routing each of the 3 stages to its granular configured OpenAI model.
 *
 * @param {Object} params
 * @param {number|string} params.planTopicId
 * @param {string} params.subTopicText
 * @param {string} params.examName
 * @param {string} params.dayTopic
 * @param {boolean} [params.isGuest=false]
 * @param {(status: string) => void} [params.onStatus]
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<{ note: Object }>}
 */
export async function generateNoteBYOK({
  planTopicId,
  subTopicText,
  examName,
  dayTopic,
  isGuest = false,
  onStatus,
  signal,
}) {
  const token = await ensureByokConnected();

  const cleanSubTopic = stripTimePrefix(subTopicText);
  const depthDirective = deriveDepthDirective(subTopicText);

  const [personaModel, outlineModel, authorModel] = await Promise.all([
    resolveModelForTask('notesPersonaModel', { accessToken: token }),
    resolveModelForTask('notesOutlineModel', { accessToken: token }),
    resolveModelForTask('notesAuthorModel', { accessToken: token }),
  ]);

  let previousContext = 'None. This is the first topic.';
  let examPersona = null;
  let planId = null;

  if (!isGuest && planTopicId) {
    try {
      const { data: topicData, error: topicError } = await supabase
        .from('plan_topics')
        .select('plan_id, day, study_plans ( exam_persona )')
        .eq('id', planTopicId)
        .maybeSingle();

      if (!topicError && topicData) {
        planId = topicData.plan_id;
        examPersona = topicData.study_plans?.exam_persona || null;

        const { data: historyData } = await supabase
          .from('plan_topics')
          .select('sub_topics')
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
    } catch (_) {}
  }

  // Stage 0: Exam Persona (cached on study_plans)
  if (!examPersona) {
    onStatus?.(`Deriving exam persona (${personaModel})...`);
    try {
      const personaRaw = await generateText({
        accessToken: token,
        model: personaModel,
        prompt: buildPersonaPrompt(examName || 'University Exam'),
        signal,
      });
      examPersona = parseAiJson(personaRaw);
      if (!isGuest && planId) {
        await supabase
          .from('study_plans')
          .update({ exam_persona: examPersona })
          .eq('id', planId);
      }
    } catch (_) {
      examPersona = {
        audience_level: 'Competitive university student',
        key_focus_areas: ['Core principles', 'Worked problems', 'Exam traps'],
        writing_style: 'Clear, authoritative, textbook-grade',
      };
    }
  }

  // Stage 1: Pedagogical Outline
  onStatus?.(`Structuring chapter outline (${outlineModel})...`);
  const chapterOutline = await generateText({
    accessToken: token,
    model: outlineModel,
    prompt: buildOutlinePrompt({
      examName,
      dayTopic,
      cleanSubTopic,
      previousContext,
      examPersona,
      depthDirective,
    }),
    signal,
  });

  if (!chapterOutline || chapterOutline.trim().length < 50) {
    throw new Error('The AI could not build a valid outline. Please try again.');
  }

  // Stage 2: Content Author
  onStatus?.(`Writing textbook note (${authorModel})...`);
  const rawNotesText = await generateText({
    accessToken: token,
    model: authorModel,
    prompt: buildAuthorPrompt({
      examName,
      dayTopic,
      cleanSubTopic,
      previousContext,
      examPersona,
      depthDirective,
      chapterOutline,
    }),
    signal,
  });

  if (!rawNotesText || rawNotesText.trim().length < 100) {
    throw new Error('The AI failed to generate a sufficiently detailed note. Please try again.');
  }

  const notesText = sanitizeDoubleEscapedLatex(rawNotesText);

  if (isGuest || !planTopicId) {
    return {
      note: {
        id: `guest_${Date.now()}`,
        plan_topic_id: planTopicId || 0,
        sub_topic_text: subTopicText,
        notes_markdown: notesText,
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
        notes_markdown: notesText,
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

/**
 * Generates notes sequentially for multiple selected subtopics using user's ChatGPT BYOK quota.
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
      // Stop early on quota exhaustion or disconnected session
      if (err?.isUsageLimit || err?.code === 'BYOK_NOT_CONNECTED') {
        throw err;
      }
    }
  }

  return createdNotes;
}

/**
 * Generates a standalone custom study note using the proven 3-stage pipeline.
 * @param {Object} params
 * @param {string} params.topicText
 * @param {string} [params.examName='General']
 * @param {string} [params.depth='STANDARD']
 * @param {boolean} [params.isGuest=false]
 * @param {(status: string) => void} [params.onStatus]
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<{ note: Object }>}
 */
export async function generateCustomNoteBYOK({
  topicText,
  examName = 'General',
  depth = 'STANDARD',
  isGuest = false,
  onStatus,
  signal,
} = {}) {
  await ensureByokConnected();
  return generateNoteBYOK({
    planTopicId: null,
    subTopicText: topicText,
    examName,
    dayTopic: topicText,
    isGuest: true,
    onStatus,
    signal,
  });
}
