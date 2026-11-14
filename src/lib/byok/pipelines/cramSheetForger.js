// src/lib/byok/pipelines/cramSheetForger.js
/**
 * Client-side 5-Phase Outline-First Cram Sheet Forger powered by ChatGPT BYOK quota.
 * Uses configured modelPreferences.cramSheetModel.
 */

import supabase from '../../supabaseClient.js';
import { ensureByokConnected, generateText, resolveModelForTask } from '../openai.js';
import { sanitizeDoubleEscapedLatex } from '../jsonSanitizer.js';
import { mapWithConcurrency } from './concurrency.js';

const LATEX_RULES = `
LATEX RULES (KATEX COMPATIBLE — UNBREAKABLE):
1. DELIMITERS: $ ... $ for inline, $$ ... $$ for display. FORBIDDEN: \\[ \\] and \\( \\).
2. ENVIRONMENTS: ONLY {matrix} {pmatrix} {bmatrix} {Vmatrix} {vmatrix} {align} {aligned} {cases}.
   FORBIDDEN: {equation} {eqnarray} {gather}.
3. SPECIAL CHARS inside math: \\% \\_ \\& (\\& is fine inside {align}).
4. All brackets and braces must be matched and closed.
5. NEVER nest $$ inside $$.
6. Always put a blank line before and after every $$ block.
`;

function buildDayBatches(planData, batchSize = 5) {
  const batches = [];
  for (let i = 0; i < planData.length; i += batchSize) {
    const days = planData.slice(i, i + batchSize).map((day) => ({
      day: day.day,
      topic_name: day.topic_name,
      subtopics: (day.sub_topics || []).map((st) => st.text).filter(Boolean),
      notes: day.generated_notes?.[0]?.notes_markdown || null,
    }));
    batches.push({
      batch_index: batches.length,
      day_range: `Day ${days[0].day}–${days[days.length - 1].day}`,
      days,
    });
  }
  return batches;
}

function buildBatchOutlinePrompt(examName, batch) {
  const daysSummary = batch.days
    .map((d) => {
      const notesPreview = d.notes ? d.notes.substring(0, 8000) : null;
      return `
--- Day ${d.day}: ${d.topic_name} ---
Subtopics covered:
${d.subtopics.map((s) => `  • ${s}`).join('\n') || '  (none listed)'}
${notesPreview ? `\nNotes content (use as primary source):\n${notesPreview}` : `\n(No notes generated yet — derive from subtopic names and your knowledge of ${examName})`}`;
    })
    .join('\n');

  return `You are a master academic editor building a cram sheet outline for "${examName}".

Your job is to produce an EXHAUSTIVE, STRUCTURED OUTLINE for ${batch.day_range} of the study plan.
This outline will be handed to a writer who will expand each point into polished cram sheet content.
Your outline determines the scope — miss nothing that matters for the exam.

${daysSummary}

PRODUCE AN OUTLINE with these exact elements for each major concept found in the content above:

## [Concept / Topic Name]

### Formulas
- Formula name: [latex expression — just the math, no $$ here]
  Variables: [define every symbol]
  Condition: [when it applies, any constraints]

### Key Theory Points
- [One crisp, examinable sentence per point. Not summaries — facts a student must know.]

### Derivations Required
- [Name of derivation + one sentence on what it proves. Include only if examinable or conceptually load-bearing at ${examName} level.]

### Exam Traps
- Trap: [The exact wrong intuition students hold going into the exam]
  Correct: [The right statement in one sentence]

### Connections
- [What prerequisite concept this builds on -> what future concept this enables]

RULES:
1. Cover EVERY concept in the days provided. Do not summarise or skip topics.
2. Every formula present in the notes MUST appear in the outline.
3. Every exam trap you know of for ${examName} for these topics MUST appear.
4. If notes are provided, they are your primary source. Do not contradict them.
5. If notes are absent, use your knowledge of ${examName} syllabus for these topics.
6. Do NOT write the actual cram sheet prose — only the outline structure above.
7. Do NOT add a preamble or explanation. Start directly with the first ## heading.`;
}

function buildMergePrompt(examName, batchOutlines) {
  const allOutlines = batchOutlines
    .map((outline, i) => `=== BATCH ${i + 1} OUTLINE ===\n${outline}\n`)
    .join('\n\n');

  return `You are merging ${batchOutlines.length} batch outlines into one master cram sheet outline for "${examName}".

${allOutlines}

YOUR TASK:
Produce ONE unified master outline by:
1. DEDUPLICATION — Keep repeated concepts ONCE marked [CANONICAL]. Cross-reference others as [-> see Section: X].
2. REORDERING — Arrange sections from FOUNDATIONAL to ADVANCED.
3. CONSOLIDATION — Merge overlapping topic sections cleanly.
4. PRESERVATION — Never drop formulas, traps, or key facts.

Start directly with the first ## heading. No preamble.`;
}

function buildSectionWriterPrompt(examName, sectionOutline, allHeadings, sectionIndex) {
  const otherHeadings = allHeadings
    .filter((_, i) => i !== sectionIndex)
    .map((h) => `  • ${h}`)
    .join('\n');

  return `You are writing ONE section of a cram sheet for "${examName}".
This is a compression artifact — every word must earn exam marks.

THE OTHER SECTIONS IN THIS CRAM SHEET (do NOT repeat their content):
${otherHeadings || '  (this is the only section)'}

YOUR SECTION OUTLINE (expand this into polished cram sheet content):
${sectionOutline}

WRITING INSTRUCTIONS:

FOR FORMULAS:
$$
[formula here]
$$
**where** $X$ = [meaning] ([unit if applicable]), $Y$ = [meaning]...
Then: 1–2 "Quick Intuition" bullets — physical meaning.
Then: exam trap blockquote if one exists.

FOR KEY THEORY POINTS:
Write tight, direct sentences. **Bold** every technical term on first use.

FOR DERIVATIONS:
*We derive this because: [what question it answers]. Without it, we cannot [what fails].*
Numbered steps, each justified briefly.

FOR EXAM TRAPS:
> ⚠️ **Trap:** [wrong belief the student holds]
> **Correct:** [right statement in one sentence]

FOR CONNECTIONS:
**Builds on:** [specific prerequisite]
**Enables:** [specific next concept]

GENERAL RULES:
1. Start directly with ## [section heading] — no preamble.
2. Cover every point in the outline.
3. Do not repeat cross-referenced content; write *(-> see section name)*.
4. No padding or "in conclusion".

${LATEX_RULES}

Output ONLY the markdown for this section.`;
}

/**
 * Forges a complete cram sheet for a study plan directly via ChatGPT BYOK quota,
 * persisting into generated_cram_sheets and streaming status events.
 *
 * @param {{ planId: number|string, onEvent?: (event: { type: string, data: any }) => void, signal?: AbortSignal }} params
 * @returns {Promise<{ cramSheetId: number|string }>}
 */
export async function forgeCramSheetBYOK({ planId, onEvent, signal }) {
  if (!planId) {
    throw new Error('Plan ID is required.');
  }

  const token = await ensureByokConnected();
  const model = await resolveModelForTask('cramSheetModel', { accessToken: token });

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) {
    throw new Error('Sign in required to create cram sheets.');
  }

  let cramSheetId = null;

  try {
    const { data: newSheet, error: insertError } = await supabase
      .from('generated_cram_sheets')
      .insert({ plan_id: planId, user_id: userId, status: 'in_progress' })
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        const { data: updatedSheet, error: updateError } = await supabase
          .from('generated_cram_sheets')
          .update({ status: 'in_progress', markdown_content: null })
          .eq('plan_id', planId)
          .eq('user_id', userId)
          .select('id')
          .single();
        if (updateError) {
          throw new Error(`DB conflict + update failed: ${updateError.message}`);
        }
        cramSheetId = updatedSheet.id;
      } else {
        throw new Error(`DB insert error: ${insertError.message}`);
      }
    } else {
      cramSheetId = newSheet.id;
    }

    onEvent?.({ type: 'status', data: { title: 'Fetching plan data...' } });

    const { data: masterPlanData, error: masterPlanError } = await supabase
      .from('study_plans')
      .select(`
        exam_name,
        plan_topics (
          day, topic_name, sub_topics,
          generated_notes ( notes_markdown )
        )
      `)
      .eq('id', planId)
      .single();

    if (masterPlanError) {
      throw new Error(`Failed to fetch plan: ${masterPlanError.message}`);
    }

    const examName = masterPlanData.exam_name;
    const planData = [...(masterPlanData.plan_topics || [])].sort((a, b) => a.day - b.day);
    const batches = buildDayBatches(planData, 5);
    const totalDays = planData.length;

    onEvent?.({
      type: 'status',
      data: {
        title: `${totalDays} days organised into ${batches.length} batch${batches.length > 1 ? 'es' : ''}. Building outlines (${model})...`,
      },
    });

    // Phase 2: Bounded-parallel batch outlines
    const batchOutlines = await mapWithConcurrency(batches, 3, async (batch) => {
      try {
        const outline = await generateText({
          accessToken: token,
          model,
          prompt: buildBatchOutlinePrompt(examName, batch),
          signal,
        });
        return outline.trim();
      } catch (err) {
        if (err?.isUsageLimit) throw err;
        return batch.days
          .map(
            (d) =>
              `## ${d.topic_name}\n\n### Key Theory Points\n- See study notes for ${d.topic_name}.`
          )
          .join('\n\n');
      }
    });

    // Phase 3: Conditional Merge Pass
    let masterOutline;
    if (batches.length === 1) {
      onEvent?.({
        type: 'status',
        data: { title: 'Outline complete. Writing cram sheet...' },
      });
      masterOutline = batchOutlines[0];
    } else {
      onEvent?.({
        type: 'status',
        data: { title: `Merging ${batchOutlines.length} outlines into master structure...` },
      });
      try {
        const merged = await generateText({
          accessToken: token,
          model,
          prompt: buildMergePrompt(examName, batchOutlines),
          signal,
        });
        masterOutline = merged.trim();
      } catch (err) {
        if (err?.isUsageLimit) throw err;
        masterOutline = batchOutlines.join('\n\n---\n\n');
      }
    }

    // Phase 4: Section Writers (bounded parallel)
    const sectionChunks = masterOutline
      .split(/\n(?=## )/)
      .map((s) => s.trim())
      .filter(Boolean);

    const allHeadings = sectionChunks.map((chunk) => {
      const match = chunk.match(/^## (.+)/);
      return match ? match[1].trim() : 'Unnamed Section';
    });

    onEvent?.({
      type: 'status',
      data: {
        title: `Writing ${sectionChunks.length} section${sectionChunks.length > 1 ? 's' : ''} (${model})...`,
      },
    });

    const sectionOutputs = await mapWithConcurrency(sectionChunks, 3, async (sectionOutline, idx) => {
      try {
        const content = await generateText({
          accessToken: token,
          model,
          prompt: buildSectionWriterPrompt(examName, sectionOutline, allHeadings, idx),
          signal,
        });
        return {
          order: idx,
          heading: allHeadings[idx],
          content: sanitizeDoubleEscapedLatex(content.trim()),
        };
      } catch (err) {
        if (err?.isUsageLimit) throw err;
        return {
          order: idx,
          heading: allHeadings[idx],
          content: `## ${allHeadings[idx]}\n\n*Section fell back to source outline:*\n\n${sectionOutline}`,
        };
      }
    });

    // Phase 5: Deterministic TOC & Markdown assembly
    sectionOutputs.sort((a, b) => a.order - b.order);
    const tocLines = sectionOutputs.map((s, i) => {
      const anchor = s.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return `${i + 1}. [${s.heading}](#${anchor})`;
    });

    const finalCramSheet = [
      `## Contents\n\n${tocLines.join('\n')}\n`,
      '',
      ...sectionOutputs.map((s) => s.content),
      '',
      '---',
      '*Generated by KalPad AI (ChatGPT BYOK) — Every word is a potential mark.*',
    ].join('\n');

    const { error: updateError } = await supabase
      .from('generated_cram_sheets')
      .update({ markdown_content: finalCramSheet, status: 'complete' })
      .eq('id', cramSheetId);

    if (updateError) {
      throw new Error(`Failed to save cram sheet: ${updateError.message}`);
    }

    onEvent?.({ type: 'complete', data: { cramSheetId } });
    return { cramSheetId };
  } catch (error) {
    if (cramSheetId) {
      await supabase
        .from('generated_cram_sheets')
        .update({ status: 'error' })
        .eq('id', cramSheetId);
    }
    onEvent?.({ type: 'error', data: { message: error.message || 'Cram sheet failed.' } });
    throw error;
  }
}
