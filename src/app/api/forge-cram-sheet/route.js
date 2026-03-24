// src/app/api/forge-cram-sheet/route.js
//
// ARCHITECTURE: 4-Phase Global Compression Pipeline
//
//   Phase 1 | Parallel Extraction  -> Flash, all topics simultaneously. Richer schema
//            |                        including exam_traps and connects_to.
//   Phase 2 | Global Architect     -> ONE call that sees ALL miner JSON and plans
//            |                        the entire section structure + word budgets
//            |                        BEFORE any prose is written.
//   Phase 3 | Parallel Sections    -> One writer per section, all parallel.
//            |                        Each writer knows the global plan so no dupes.
//   Phase 4 | JS Assembly          -> No LLM. Collects sections, prepends TOC, saves.

import { getVertexAIModel } from '@/lib/vertexai';
import { logRouteResult, resolveRouteAuth, unauthorizedResponse } from '@/lib/routeAuth';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — SHARED LATEX RULES
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
// SECTION 2 — PROMPT BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

function buildExtractionPrompt(examName, topicName, sourceText) {
    const topicId = topicName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const preview = sourceText.substring(0, 14000);
    return `You are a meticulous Academic Auditor. Extract ALL exam-relevant information.
This extraction builds a cram sheet for "${examName}".

Topic: "${topicName}"
Source:
"""
${preview}
"""

Return ONLY valid JSON (no prose, no fences):
{
  "topic_id": "${topicId}",
  "topic_name": "${topicName}",
  "formulas": [
    {
      "name": "Human-readable formula name",
      "latex": "Formula in valid KaTeX — no $$ wrappers here, just the math",
      "variables": "where X = ..., Y = ... (all variables defined concisely)"
    }
  ],
  "definitions": [
    {
      "term": "Technical term",
      "one_liner": "Precise one-sentence definition at ${examName} level"
    }
  ],
  "exam_traps": [
    {
      "trap": "The exact wrong intuition students bring into the exam room",
      "correction": "The correct statement in one sentence"
    }
  ],
  "key_facts": ["One directly-examinable sentence — no fluff"],
  "connects_to": ["Name of another topic this directly enables or depends on"]
}

RULES:
- Extract every formula. The Architect decides importance — not you.
- exam_traps are MANDATORY. Minimum 1. If the source text doesn't state one, derive it from common
  mistakes students make on ${examName} for this topic.
- key_facts must be directly examinable. Not summaries. Not "this is important."
- If the source text is sparse (no real notes), still extract what you can and add "sparse_source": true.`;
}


function buildArchitectPrompt(examName, allExtractions, planDays) {
    const totalFormulas    = allExtractions.reduce((s, e) => s + (e.formulas?.length    || 0), 0);
    const totalDefinitions = allExtractions.reduce((s, e) => s + (e.definitions?.length || 0), 0);
    const totalTraps       = allExtractions.reduce((s, e) => s + (e.exam_traps?.length  || 0), 0);
    const wordTarget       = Math.min(2500, Math.max(800, allExtractions.length * 90));

    return `You are a master academic architect planning a cram sheet.
Exam: "${examName}"
Plan: ${planDays} days, ${allExtractions.length} topics

Extraction Summary:
- Total formulas: ${totalFormulas}
- Total definitions: ${totalDefinitions}
- Total exam traps: ${totalTraps}

ALL TOPIC EXTRACTIONS:
${JSON.stringify(allExtractions, null, 2)}

Plan the ENTIRE cram sheet structure before any writing begins.
Return ONLY valid JSON (no prose, no fences):

{
  "exam_name": "${examName}",
  "total_word_target": ${wordTarget},
  "subject_type": "quantitative OR qualitative OR mixed",
  "opening_summary": "2-3 sentences: what this plan covers and what the student can do after reviewing this sheet. Exam-specific, not generic.",
  "sections": [
    {
      "section_id": "s1",
      "heading": "Short substantive heading — NOT Day X, NOT Introduction",
      "rationale": "One sentence: why these topics belong together",
      "assigned_topic_ids": ["topic_id_1", "topic_id_2"],
      "word_budget": 300,
      "priority": "high OR medium OR low",
      "section_type": "formula_heavy OR definition_heavy OR mixed OR exam_strategy",
      "cross_references": ["heading of another section to briefly link to"]
    }
  ],
  "global_dedup_log": [
    {
      "formula_name": "Name of formula appearing in multiple topics",
      "canonical_topic_id": "The topic whose version is the master",
      "duplicate_topic_ids": ["Other topic IDs with duplicates — writers skip it there"]
    }
  ]
}

ARCHITECTURE RULES:
1. CLUSTER by academic significance, not day order.
2. Sections flow from foundational to advanced.
3. word_budget values MUST sum to exactly ${wordTarget}.
4. Identify ALL duplicate formulas in global_dedup_log.
5. section_type drives formatting: formula_heavy = Formula-First, definition_heavy = Hierarchical,
   exam_strategy = Tips and traps only.
6. 1-6 topics per section. Every topic_id must appear in exactly one section.
7. NEVER name a section "Introduction", "Overview", "Summary", or "Day X".`;
}


function buildSectionWriterPrompt(examName, section, sectionExtractions, architectPlan, dedupLog) {
    const exclusions = dedupLog
        .filter(d => !section.assigned_topic_ids.includes(d.canonical_topic_id)
                  && d.duplicate_topic_ids.some(id => section.assigned_topic_ids.includes(id)))
        .map(d => d.formula_name);

    const crossRefNote = section.cross_references?.length
        ? `Cross-reference where relevant: ${section.cross_references.join(', ')}.`
        : '';

    const formatGuides = {
        formula_heavy: `FORMAT: Formula-First.
For each formula:
1. Display math on its own line (with blank lines around $$)
2. Variable glossary: "where $X$ = ..., $Y$ = ..."
3. 1-2 Quick Intuition bullets (what it physically means)
4. Exam trap in blockquote if one exists for this formula`,

        definition_heavy: `FORMAT: Hierarchical.
For each concept:
1. **Bold Term** — concise definition
2. Cause-and-effect with arrows: A → B → C
3. Exam trap in blockquote if one exists`,

        mixed: `FORMAT: Blend Formula-First for quantitative concepts, Hierarchical for qualitative ones.
Use your judgment per concept.`,

        exam_strategy: `FORMAT: Tips and Traps only. No derivations.
Every trap goes in a blockquote: > ⚠️ **Trap:** [trap]. **Correct:** [correction]
Use bullets for pattern-recognition tips.
This section is for the student's final 30 minutes before entering the exam hall.`,
    };

    const formatGuide = formatGuides[section.section_type] || formatGuides.mixed;

    const globalStructureList = architectPlan.sections
        .map(s => s.section_id === section.section_id
            ? `-> [YOUR SECTION] ## ${s.heading}`
            : `   ## ${s.heading}`)
        .join('\n');

    return `You are writing ONE section of a cram sheet for "${examName}".
This is a compression artifact — maximum information per word, zero fluff.

YOUR BRIEF:
Heading:      ${section.heading}
Priority:     ${section.priority}
Section type: ${section.section_type}
Word budget:  ${section.word_budget} words (hard limit — do not exceed by more than 10%)
${crossRefNote}

GLOBAL STRUCTURE (do NOT repeat content from other sections):
${globalStructureList}

YOUR EXTRACTION DATA:
${JSON.stringify(sectionExtractions, null, 2)}

${exclusions.length > 0 ? `SKIP THESE (already in another section): ${exclusions.join(', ')}` : ''}

${formatGuide}

${LATEX_RULES}

WRITING RULES:
1. Start directly with "## ${section.heading}" — no preamble.
2. Bold every technical term on first use: **term**.
3. Exam traps: > ⚠️ **Trap:** [wrong belief]. **Correct:** [right statement]
4. No day references. No meta-commentary ("This section covers...").
5. Cross-references inline: *(→ see [Section Heading])*
6. Every sentence must be directly examinable. Cut anything that doesn't earn marks.
7. Stay within your word budget.

Output ONLY the markdown. Start with ## ${section.heading}.`;
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — POST HANDLER
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

                // DB Setup — upsert on conflict (unchanged from original)
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

                // Fetch plan
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

                // ─── PHASE 1: PARALLEL EXTRACTION ────────────────────────────
                // Flash, all topics simultaneously. No batching needed.
                streamUpdate('status', { title: `Phase 1: Extracting material from ${planData.length} topics in parallel...` });

                const extractionModel = await getVertexAIModel('gemini-2.5-flash', {
                    responseMimeType: 'application/json',
                });

                const allExtractions = await Promise.all(
                    planData.map(async (day) => {
                        const sourceText = day.generated_notes?.[0]?.notes_markdown
                            || `Topic: ${day.topic_name}.\nSub-topics: ${day.sub_topics?.map(st => st.text).join(', ') || 'none listed.'}`;

                        try {
                            const result = await extractionModel.generateContent({
                                contents: [{ role: 'user', parts: [{ text: buildExtractionPrompt(examName, day.topic_name, sourceText) }] }]
                            });
                            const raw  = result.response.candidates[0].content.parts[0].text;
                            const data = JSON.parse(raw.replace(/```json|```/g, '').trim());
                            // Pin topic_id to a stable value regardless of what the LLM returned
                            data.topic_id   = day.topic_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                            data.topic_name = day.topic_name;
                            return data;
                        } catch (e) {
                            console.warn(`Extraction failed for "${day.topic_name}":`, e.message);
                            return {
                                topic_id:     day.topic_name.replace(/[^a-z0-9]/gi, '_').toLowerCase(),
                                topic_name:   day.topic_name,
                                formulas:     [],
                                definitions:  [],
                                exam_traps:   [],
                                key_facts:    [`${day.topic_name} — extraction failed, review manually.`],
                                connects_to:  [],
                                sparse_source: true,
                            };
                        }
                    })
                );

                const validCount = allExtractions.filter(e => !e.sparse_source).length;
                console.log(`[CramSheet] Phase 1 done. ${validCount}/${allExtractions.length} topics OK.`);
                streamUpdate('status', { title: `Phase 1 done. ${validCount}/${allExtractions.length} topics extracted.` });

                // ─── PHASE 2: GLOBAL ARCHITECT ────────────────────────────────
                // One call, sees everything, plans everything.
                streamUpdate('status', { title: 'Phase 2: Architecting global structure...' });

                const architectModel = await getVertexAIModel('gemini-2.5-flash', {
                    responseMimeType: 'application/json',
                });

                const architectResult = await architectModel.generateContent({
                    contents: [{ role: 'user', parts: [{ text: buildArchitectPrompt(examName, allExtractions, planData.length) }] }]
                });

                let architectPlan;
                try {
                    const raw = architectResult.response.candidates[0].content.parts[0].text;
                    architectPlan = JSON.parse(raw.replace(/```json|```/g, '').trim());
                } catch (e) {
                    throw new Error('Architect returned malformed JSON. Cannot proceed to writing.');
                }

                if (!architectPlan?.sections?.length) {
                    throw new Error('Architect produced no sections. Plan may be empty or all extractions failed.');
                }

                console.log(`[CramSheet] Phase 2 done. ${architectPlan.sections.length} sections. Target: ${architectPlan.total_word_target} words.`);
                streamUpdate('status', { title: `Phase 2 done. Writing ${architectPlan.sections.length} sections...` });

                // ─── PHASE 3: PARALLEL SECTION WRITING ───────────────────────
                // All sections run simultaneously. Deduplication is pre-resolved
                // in the architect's global_dedup_log so there are no race conditions.
                const writerModel   = await getVertexAIModel('gemini-2.5-flash');
                const dedupLog      = architectPlan.global_dedup_log || [];
                const extractionMap = new Map(allExtractions.map(e => [e.topic_id, e]));

                const sectionOutputs = await Promise.all(
                    architectPlan.sections.map(async (section, idx) => {
                        const sectionExtractions = section.assigned_topic_ids
                            .map(id => extractionMap.get(id))
                            .filter(Boolean);

                        try {
                            const result = await writerModel.generateContent({
                                contents: [{
                                    role: 'user',
                                    parts: [{ text: buildSectionWriterPrompt(
                                        examName, section, sectionExtractions, architectPlan, dedupLog
                                    ) }]
                                }]
                            });
                            return {
                                order:   idx,
                                content: result.response.candidates[0].content.parts[0].text.trim(),
                            };
                        } catch (e) {
                            console.warn(`Section "${section.heading}" write failed:`, e.message);
                            return {
                                order:   idx,
                                content: `## ${section.heading}\n\n*Section failed — review source material manually.*\n`,
                            };
                        }
                    })
                );

                // ─── PHASE 4: JS ASSEMBLY (no LLM) ───────────────────────────
                sectionOutputs.sort((a, b) => a.order - b.order);

                // Auto-generate TOC from architect's section headings
                const tocLines = architectPlan.sections.map((s, i) => {
                    const anchor = s.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    return `${i + 1}. [${s.heading}](#${anchor})`;
                });

                const opening = architectPlan.opening_summary
                    ? `> ${architectPlan.opening_summary}\n\n`
                    : '';

                const finalCramSheet = [
                    opening,
                    `## Contents\n\n${tocLines.join('\n')}\n`,
                    '',
                    ...sectionOutputs.map(s => s.content),
                    '',
                    '---',
                    '*Generated by KalPad AI ✨ — Every word is a potential mark.*',
                ].join('\n');

                console.log(`[CramSheet] Phase 4 done. Total: ${finalCramSheet.length} chars.`);

                // DB write
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