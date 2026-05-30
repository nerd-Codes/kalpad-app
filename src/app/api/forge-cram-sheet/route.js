// src/app/api/forge-cram-sheet/route.js
//
// ARCHITECTURE: 5-Phase Outline-First Pipeline
//
//   Phase 1 | Subtopic Collection   -> Pure JS. Flat list of subtopics grouped by day.
//   Phase 2 | Batch Outlines        -> Parallel, one call per batch of 5 days.
//            |                         Each batch gets subtopics + notes content.
//            |                         Produces exhaustive outline: headings, formulas,
//            |                         derivations, traps — no depth ceiling.
//   Phase 3 | Global Merge Pass     -> CONDITIONAL. Skipped if only one batch exists.
//            |                         One call receiving all batch outlines.
//            |                         Deduplicates, orders foundational → advanced,
//            |                         produces a single master outline.
//   Phase 4 | Parallel Section      -> One writer per top-level section.
//            |                         Each writer gets its section outline + global
//            |                         heading list to avoid cross-section repetition.
//            |                         No word budget ceiling — outline determines scope.
//   Phase 5 | JS Assembly           -> TOC + merge + save. No LLM.

import { getVertexAIModel } from '@/lib/vertexai';
import { logRouteResult, resolveRouteAuth, unauthorizedResponse } from '@/lib/routeAuth';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — SHARED RULES
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — PURE JS HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Phase 1 — pure JS, no LLM.
 * Returns an array of batch objects, each covering up to BATCH_SIZE days.
 * Each batch contains the day number, topic name, subtopic texts, and notes content.
 */
function buildDayBatches(planData, batchSize = 5) {
    const batches = [];
    for (let i = 0; i < planData.length; i += batchSize) {
        const days = planData.slice(i, i + batchSize).map(day => ({
            day:         day.day,
            topic_name:  day.topic_name,
            subtopics:   (day.sub_topics || []).map(st => st.text).filter(Boolean),
            notes:       day.generated_notes?.[0]?.notes_markdown || null,
        }));
        batches.push({
            batch_index: batches.length,
            day_range:   `Day ${days[0].day}–${days[days.length - 1].day}`,
            days,
        });
    }
    return batches;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — PROMPT BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Phase 2 — Batch Outline Prompt.
 *
 * Given 1–5 days of subtopics and notes, produce an exhaustive outline.
 * The outline declares every formula, derivation, definition, and exam trap
 * that should appear in the final cram sheet for these days.
 * No depth ceiling — the outline's scope is the writer's contract.
 */
function buildBatchOutlinePrompt(examName, batch) {
    const daysSummary = batch.days.map(d => {
        const notesPreview = d.notes
            ? d.notes.substring(0, 8000)
            : null;
        return `
--- Day ${d.day}: ${d.topic_name} ---
Subtopics covered:
${d.subtopics.map(s => `  • ${s}`).join('\n') || '  (none listed)'}
${notesPreview ? `\nNotes content (use as primary source):\n${notesPreview}` : '\n(No notes generated yet — derive from subtopic names and your knowledge of ${examName})'}`;
    }).join('\n');

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
- [Name of derivation + one sentence on what it proves. Only include if it is actually
  examinable or conceptually load-bearing for this topic at ${examName} level.]

### Exam Traps
- Trap: [The exact wrong intuition students hold going into the exam]
  Correct: [The right statement in one sentence]

### Connections
- [What prerequisite concept this builds on → what future concept this enables]

RULES:
1. Cover EVERY concept in the days provided. Do not summarise or skip topics.
2. Every formula present in the notes MUST appear in the outline.
3. Every exam trap you know of for ${examName} for these topics MUST appear.
4. If notes are provided, they are your primary source. Do not contradict them.
5. If notes are absent, use your knowledge of ${examName} syllabus for these topics.
6. Do NOT write the actual cram sheet prose — only the outline structure above.
7. Do NOT add a preamble or explanation. Start directly with the first ## heading.
8. Group related subtopics under shared concept headings where logical.
   (e.g. "Unit Impulse", "Unit Step", "Exponential Sequence" → "## Standard DT Sequences")`;
}


/**
 * Phase 3 — Global Merge Prompt (only called when batches > 1).
 *
 * Receives all batch outlines as a single document.
 * Deduplicates formulas and concepts that appear in multiple batches.
 * Reorders from foundational to advanced.
 * Produces one master outline the writers work from.
 */
function buildMergePrompt(examName, batchOutlines) {
    const allOutlines = batchOutlines.map((outline, i) =>
        `=== BATCH ${i + 1} OUTLINE ===\n${outline}\n`
    ).join('\n\n');

    return `You are merging ${batchOutlines.length} batch outlines into one master cram sheet outline for "${examName}".

${allOutlines}

YOUR TASK:
Produce ONE unified master outline by:

1. DEDUPLICATION — If the same formula, concept, or exam trap appears in multiple batches,
   keep it ONCE in the most appropriate section. Mark canonical entries with [CANONICAL].
   Other batches that reference the same content should note: [→ see Section: X]

2. REORDERING — Rearrange sections from FOUNDATIONAL to ADVANCED, ignoring original day order.
   A student reading the cram sheet should be able to follow it without confusion.
   Prerequisites always appear before the concepts that depend on them.

3. CONSOLIDATION — If two batches cover different aspects of the same topic
   (e.g. "Z-Transform Definition" in batch 1 and "Z-Transform Properties" in batch 2),
   merge them under one ## heading with the content from both.

4. PRESERVATION — Do not lose any formula, trap, or theory point in the process.
   If in doubt, keep it. The writers will handle density.

OUTPUT: The complete master outline in the same structured format as the input outlines.
(## headings → ### Formulas / Key Theory / Derivations / Exam Traps / Connections)
Start directly with the first ## heading. No preamble.`;
}


/**
 * Phase 4 — Section Writer Prompt.
 *
 * Given one ## section from the master outline, writes the actual cram sheet content.
 * Knows the global heading list to avoid repeating content from other sections.
 * No word budget ceiling — the outline determines depth.
 */
function buildSectionWriterPrompt(examName, sectionOutline, allHeadings, sectionIndex) {
    const otherHeadings = allHeadings
        .filter((_, i) => i !== sectionIndex)
        .map(h => `  • ${h}`)
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
Then: 1–2 "Quick Intuition" bullets — what the formula physically means, not just what it says.
Then: exam trap blockquote if one exists for this formula.

FOR KEY THEORY POINTS:
Write as tight, direct sentences. **Bold** every technical term on first use.
No "In this section we will..." — every sentence is a direct fact.

FOR DERIVATIONS:
*We derive this because: [what question it answers]. Without it, we cannot [what fails].*
Then the derivation steps, numbered, each step justified in one short phrase.

FOR EXAM TRAPS:
> ⚠️ **Trap:** [wrong belief the student holds]
> **Correct:** [right statement in one sentence]

FOR CONNECTIONS:
End the section with:
**Builds on:** [specific prerequisite]
**Enables:** [specific next concept]

GENERAL RULES:
1. Start directly with ## [section heading] — no preamble.
2. Cover every point in the outline. Do not skip anything.
3. Do not repeat content flagged as [→ see Section: X] in the outline — just write the cross-reference inline: *(→ see [section name])*
4. No meta-commentary ("This section covers...").
5. No padding. No "in conclusion". No summaries at the end.

${LATEX_RULES}

Output ONLY the markdown for this section.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — POST HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request) {
    const auth     = await resolveRouteAuth(request);
    const authMode = auth.authMode;
    const { supabase, user } = auth;

    if (!user) {
        logRouteResult('/api/forge-cram-sheet', authMode, 401);
        return unauthorizedResponse();
    }

    const { plan_id } = await request.json();
    if (!plan_id) {
        return new Response(JSON.stringify({ error: 'Plan ID is required' }), { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream  = new ReadableStream({
        async start(controller) {

            const streamUpdate = (type, data) => {
                try {
                    controller.enqueue(encoder.encode(JSON.stringify({ type, data }) + '\n---\n'));
                } catch (e) {
                    console.warn(`Could not stream ('${type}') to closed controller.`);
                }
            };

            let cramSheetId = null;

            try {

                // ── DB Setup ──────────────────────────────────────────────────
                const { data: newSheet, error: insertError } = await supabase
                    .from('generated_cram_sheets')
                    .insert({ plan_id, user_id: user.id, status: 'in_progress' })
                    .select('id')
                    .single();

                if (insertError) {
                    if (insertError.code === '23505') {
                        const { data: updatedSheet, error: updateError } = await supabase
                            .from('generated_cram_sheets')
                            .update({ status: 'in_progress', markdown_content: null })
                            .eq('plan_id', plan_id)
                            .eq('user_id', user.id)
                            .select('id')
                            .single();
                        if (updateError) throw new Error(`DB conflict + update failed: ${updateError.message}`);
                        cramSheetId = updatedSheet.id;
                    } else {
                        throw new Error(`DB insert error: ${insertError.message}`);
                    }
                } else {
                    cramSheetId = newSheet.id;
                }

                // ── Fetch Plan ────────────────────────────────────────────────
                streamUpdate('status', { title: 'Fetching plan data...' });

                const { data: masterPlanData, error: masterPlanError } = await supabase
                    .from('study_plans')
                    .select(`
                        exam_name,
                        plan_topics (
                            day, topic_name, sub_topics,
                            generated_notes ( notes_markdown )
                        )
                    `)
                    .eq('id', plan_id)
                    .single();

                if (masterPlanError) throw new Error(`Failed to fetch plan: ${masterPlanError.message}`);

                const examName = masterPlanData.exam_name;
                const planData = masterPlanData.plan_topics.sort((a, b) => a.day - b.day);

                // ─── PHASE 1: SUBTOPIC COLLECTION (pure JS) ───────────────────
                // Group subtopics by day, batch into groups of 5.
                // No LLM involved. This is just data reshaping.
                const batches = buildDayBatches(planData, 5);
                const totalDays = planData.length;

                console.log(`[CramSheet] Phase 1: ${totalDays} days → ${batches.length} batch(es)`);
                streamUpdate('status', { title: `${totalDays} days organised into ${batches.length} batch${batches.length > 1 ? 'es' : ''}. Building outlines...` });

                // ─── PHASE 2: BATCH OUTLINES (parallel) ──────────────────────
                // One call per batch, all run simultaneously.
                const model = await getVertexAIModel('gemini-2.5-flash');

                const batchOutlines = await Promise.all(
                    batches.map(async (batch) => {
                        try {
                            const result = await model.generateContent({
                                contents: [{ role: 'user', parts: [{ text: buildBatchOutlinePrompt(examName, batch) }] }]
                            });
                            return result.response.candidates[0].content.parts[0].text.trim();
                        } catch (e) {
                            console.warn(`[CramSheet] Outline failed for ${batch.day_range}:`, e.message);
                            // Fallback: a minimal outline from topic names so we don't lose the batch
                            return batch.days.map(d => `## ${d.topic_name}\n\n### Key Theory Points\n- See study notes for ${d.topic_name}.`).join('\n\n');
                        }
                    })
                );

                console.log(`[CramSheet] Phase 2 done. ${batchOutlines.length} outline(s) generated.`);

                // ─── PHASE 3: GLOBAL MERGE PASS (conditional) ─────────────────
                // Skip entirely if there is only one batch — nothing to merge.
                // This saves one LLM call for plans ≤ 5 days.
                let masterOutline;

                if (batches.length === 1) {
                    // Single batch — no merge needed. The outline IS the master outline.
                    console.log('[CramSheet] Phase 3: SKIPPED (single batch, no merge needed).');
                    streamUpdate('status', { title: 'Outline complete. Writing cram sheet...' });
                    masterOutline = batchOutlines[0];
                } else {
                    // Multiple batches — run the merge pass to deduplicate and reorder.
                    console.log(`[CramSheet] Phase 3: Merging ${batchOutlines.length} outlines...`);
                    streamUpdate('status', { title: `Merging ${batchOutlines.length} outlines into master structure...` });

                    try {
                        const mergeResult = await model.generateContent({
                            contents: [{ role: 'user', parts: [{ text: buildMergePrompt(examName, batchOutlines) }] }]
                        });
                        masterOutline = mergeResult.response.candidates[0].content.parts[0].text.trim();
                        console.log('[CramSheet] Phase 3 done. Master outline ready.');
                    } catch (e) {
                        // If the merge fails, concatenate batch outlines as-is.
                        // The writers will still produce valid content — just with possible duplicates.
                        console.warn('[CramSheet] Phase 3 merge failed, falling back to concatenated outlines:', e.message);
                        masterOutline = batchOutlines.join('\n\n---\n\n');
                    }
                }

                // ─── PHASE 4: PARALLEL SECTION WRITERS ───────────────────────
                // Split the master outline into per-section chunks at ## boundaries.
                // Each section gets its own writer call, all run simultaneously.
                const sectionChunks = masterOutline
                    .split(/\n(?=## )/)
                    .map(s => s.trim())
                    .filter(Boolean);

                // Extract just the heading text for cross-reference context
                const allHeadings = sectionChunks.map(chunk => {
                    const match = chunk.match(/^## (.+)/);
                    return match ? match[1].trim() : 'Unnamed Section';
                });

                console.log(`[CramSheet] Phase 4: Writing ${sectionChunks.length} section(s) in parallel...`);
                streamUpdate('status', { title: `Writing ${sectionChunks.length} section${sectionChunks.length > 1 ? 's' : ''} in parallel...` });

                const sectionOutputs = await Promise.all(
                    sectionChunks.map(async (sectionOutline, idx) => {
                        try {
                            const result = await model.generateContent({
                                contents: [{
                                    role: 'user',
                                    parts: [{ text: buildSectionWriterPrompt(examName, sectionOutline, allHeadings, idx) }]
                                }]
                            });
                            return {
                                order:   idx,
                                heading: allHeadings[idx],
                                content: result.response.candidates[0].content.parts[0].text.trim(),
                            };
                        } catch (e) {
                            console.warn(`[CramSheet] Section write failed for "${allHeadings[idx]}":`, e.message);
                            // Fallback: emit the raw outline section so the student still gets something
                            return {
                                order:   idx,
                                heading: allHeadings[idx],
                                content: `## ${allHeadings[idx]}\n\n*Generation failed for this section. Source outline:*\n\n${sectionOutline}`,
                            };
                        }
                    })
                );

                // ─── PHASE 5: JS ASSEMBLY (no LLM) ───────────────────────────
                sectionOutputs.sort((a, b) => a.order - b.order);

                const tocLines = sectionOutputs.map((s, i) => {
                    const anchor = s.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    return `${i + 1}. [${s.heading}](#${anchor})`;
                });

                const finalCramSheet = [
                    `## Contents\n\n${tocLines.join('\n')}\n`,
                    '',
                    ...sectionOutputs.map(s => s.content),
                    '',
                    '---',
                    '*Generated by KalPad AI ✨ — Every word is a potential mark.*',
                ].join('\n');

                console.log(`[CramSheet] Phase 5 done. Final: ${finalCramSheet.length} chars, ${sectionOutputs.length} sections.`);

                const { error: updateError } = await supabase
                    .from('generated_cram_sheets')
                    .update({ markdown_content: finalCramSheet, status: 'complete' })
                    .eq('id', cramSheetId);

                if (updateError) throw new Error(`Failed to save cram sheet: ${updateError.message}`);

                streamUpdate('complete', { cramSheetId });
                controller.close();

            } catch (error) {
                console.error('Critical error in forge-cram-sheet:', error);
                if (cramSheetId) {
                    await supabase
                        .from('generated_cram_sheets')
                        .update({ status: 'error' })
                        .eq('id', cramSheetId);
                }
                streamUpdate('error', { message: error.message || 'An unknown error occurred.' });
                controller.close();
            }
        }
    });

    logRouteResult('/api/forge-cram-sheet', authMode, 200);
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection':    'keep-alive',
        },
    });
}