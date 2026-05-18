// src/app/api/generate-notes/route.js

import { GoogleGenerativeAI } from "@google/generative-ai";
import { inngest } from '@/lib/inngest';
import { getVertexAIModel } from '@/lib/vertexai';
import { logRouteResult, resolveRouteAuth, unauthorizedResponse } from '@/lib/routeAuth';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function cleanJSON(text) {
    try {
        return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (e) {
        const start = text.indexOf('{');
        const end   = text.lastIndexOf('}');
        if (start !== -1 && end !== -1) return JSON.parse(text.substring(start, end + 1));
        throw new Error("AI returned malformed JSON.");
    }
}

/**
 * Strips scheduler time prefixes like "(30 min)", "(1.5h)", "(2 hours)" from
 * sub_topic_text before passing to any AI call.
 *
 * Root cause of depth bug: the model reads "(30 min)" and infers
 * "short topic → thin note." Study time ≠ note depth.
 * A 30-minute session can and should have a thorough 1500-word note.
 */
function stripTimePrefix(text) {
    return text
        .replace(/^\s*\(\s*[\d.]+\s*(?:h|hr|hrs|hour|hours|min|mins|minute|minutes)\s*\)\s*/i, '')
        .trim();
}

/**
 * Maps study time to an explicit depth directive.
 * Passed to both Outliner and Author so depth intent is unambiguous.
 */
function deriveDepthDirective(rawText) {
    const match = rawText.match(/^\s*\(\s*([\d.]+)\s*(h|hr|hrs|hour|hours|min|mins|minute|minutes)\s*\)/i);
    if (!match) return 'STANDARD';
    const hours = match[2].toLowerCase().startsWith('h') ? parseFloat(match[1]) : parseFloat(match[1]) / 60;
    if (hours < 0.75) return 'ESSENTIAL';    // < 45 min: concise, every sentence earns its place
    if (hours < 1.25) return 'STANDARD';     // 45 min–1h45: full treatment with examples
    return 'COMPREHENSIVE';                   // > 1h45: exhaustive, derivations, edge cases
}

const DEPTH_GUIDE = {
    ESSENTIAL:     'ESSENTIAL — Be concise and focused. Cover core concepts only. No digressions. Target ~700–1000 words.',
    STANDARD:      'STANDARD — Full treatment with worked examples and derivations. Target ~1200–2000 words.',
    COMPREHENSIVE: 'COMPREHENSIVE — Exhaustive coverage. Full derivations, multiple examples, edge cases. Target ~2500–3500 words.',
};

// ─────────────────────────────────────────────────────────────────────────────
// PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

function buildPersonaPrompt(examName) {
    return `You are an expert academic analyst. Based on the exam name below, generate a concise persona document that will guide another AI in writing study notes.

Exam: "${examName}"

Return a single valid JSON object:
{
  "audience_level": "Short description of target audience",
  "key_focus_areas": ["Critical concept or skill type 1", "..."],
  "writing_style": "Tone directive for writing"
}

Examples:
- GATE Electronics → audience: "Post-graduate engineering, highly competitive", focus: ["Problem-solving", "Core theorems", "Numerical accuracy"], style: "Dense, technical, textbook-level"
- CBSE Class 12 → audience: "High school senior", focus: ["Key definitions", "Step-by-step derivations", "Standard problems"], style: "Clear, simple, use analogies"`;
}

/**
 * STAGE 1 — OUTLINER
 *
 * Kept close to the original that produced textbook-quality output.
 * Key additions:
 *   - Depth directive from time annotation (fixes depth compression)
 *   - Instruction to flag common misconceptions in the outline
 *   - Instruction to note where worked examples are needed
 *
 * NOT converted to JSON — free-form markdown outline gives the Author
 * the creative latitude that made the original output feel like a real chapter.
 */
function buildOutlinePrompt({ examName, dayTopic, cleanSubTopic, previousContext, examPersona, depthDirective }) {
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

/**
 * STAGE 2 — AUTHOR
 *
 * Based on the original Author prompt that produced textbook-quality output.
 * The original worked because it gave the Author genuine creative latitude.
 * Improvements added:
 *   - Depth directive with word target (fixes depth compression)
 *   - Misconception blocks made explicit (highest exam value)
 *   - Symbol glossary after equations (removes ambiguity)
 *   - Connection footer (exam context + what this unlocks)
 *   - Mermaid removed — matplotlib only
 *   - LaTeX rules tightened
 */
function buildAuthorPrompt({ examName, dayTopic, cleanSubTopic, previousContext, examPersona, depthDirective, chapterOutline }) {
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
- All brackets and braces must be correctly matched and closed.

ILLUSTRATIONS (matplotlib ONLY):
- Use sparingly — only when a graph or plot is truly necessary to understand a concept.
- NEVER use mermaid. Only matplotlib is supported.
- Place the block immediately after the paragraph it illustrates.

\`\`\`kalpad-illustration
{
  "engine": "matplotlib",
  "description": "Exact description of the plot: axis labels with units, variable names, key points to mark, scale."
}
\`\`\``;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request) {
    let authMode = 'none';
    try {
        const auth = await resolveRouteAuth(request);
        authMode   = auth.authMode;
        const { supabase, user } = auth;

        if (!user) {
            logRouteResult('/api/generate-notes', authMode, 401);
            return unauthorizedResponse();
        }

        const { plan_topic_id, sub_topic_text, exam_name, day_topic } = await request.json();

        // Strip time prefix before ANY AI call — this is the depth fix.
        // The model must never see "(30 min)" or it infers "short topic → thin note."
        const cleanSubTopic  = stripTimePrefix(sub_topic_text);
        const depthDirective = deriveDepthDirective(sub_topic_text);

        // ── CONTEXT RETRIEVAL ────────────────────────────────────────────────
        const { data: topicData, error: topicError } = await supabase
            .from('plan_topics')
            .select('relevant_page_images, plan_id, day, study_plans ( exam_persona )')
            .eq('id', plan_topic_id)
            .single();

        if (topicError) throw new Error(`Failed to fetch topic data: ${topicError.message}`);

        // Zero-Latency Context: 3 immediately preceding sub-topics.
        // Also strip time prefixes from history so the chain reads cleanly.
        let previousContext = "None. This is the first topic.";
        try {
            const { data: historyData } = await supabase
                .from('plan_topics')
                .select('sub_topics')
                .eq('plan_id', topicData.plan_id)
                .lte('day', topicData.day)
                .order('day', { ascending: true });

            if (historyData) {
                const allTopics    = historyData.flatMap(d => d.sub_topics?.map(st => stripTimePrefix(st.text)) || []);
                const currentIndex = allTopics.indexOf(cleanSubTopic);
                if (currentIndex > 0) {
                    const prev = allTopics.slice(Math.max(0, currentIndex - 3), currentIndex);
                    if (prev.length > 0) previousContext = prev.join(' → ');
                }
            }
        } catch (e) { console.warn("Context fetch warning:", e); }

        // RAG — re-enable when needed
        // const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
        // ...

        // ── STAGE 0: EXAM PERSONA (CACHED PER PLAN) ─────────────────────────
        let examPersona = topicData.study_plans.exam_persona;

        if (!examPersona) {
            console.log(`[Persona Cache] MISS for Plan ${topicData.plan_id}. Generating...`);
            const personaModel  = await getVertexAIModel('gemini-2.5-flash', { responseMimeType: "application/json" });
            const personaResult = await personaModel.generateContent({
                contents: [{ role: 'user', parts: [{ text: buildPersonaPrompt(exam_name) }] }]
            });
            examPersona = cleanJSON(personaResult.response.candidates[0].content.parts[0].text);
            await supabase
                .from('study_plans')
                .update({ exam_persona: examPersona })
                .eq('id', topicData.plan_id);
        } else {
            console.log(`[Persona Cache] HIT for Plan ${topicData.plan_id}.`);
        }

        const model = await getVertexAIModel('gemini-2.5-flash');

        // ── STAGE 1: OUTLINER ────────────────────────────────────────────────
        // Free-form markdown outline — gives the Author creative latitude.
        // This is what made the original output feel like a real textbook chapter.
        const outlineResult = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: buildOutlinePrompt({
                examName:        exam_name,
                dayTopic:        day_topic,
                cleanSubTopic,
                previousContext,
                examPersona,
                depthDirective,
            }) }] }]
        });
        const chapterOutline = outlineResult.response.candidates[0].content.parts[0].text;

        if (!chapterOutline || chapterOutline.trim().length < 50) {
            throw new Error("The AI could not build a valid outline. The topic may be too abstract or lack sufficient context.");
        }

        // ── STAGE 2: AUTHOR ──────────────────────────────────────────────────
        const authorResult = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: buildAuthorPrompt({
                examName:        exam_name,
                dayTopic:        day_topic,
                cleanSubTopic,
                previousContext,
                examPersona,
                depthDirective,
                chapterOutline,
            }) }] }]
        });
        const notesText = authorResult.response.candidates[0].content.parts[0].text;

        if (!notesText || notesText.trim().length < 100) {
            throw new Error("The AI failed to generate a sufficiently detailed note. Please try again.");
        }

        // ── DB WRITE ─────────────────────────────────────────────────────────
        // Store original sub_topic_text (with time prefix) as the record key
        // so it matches what the frontend sent.
        const { data: savedNote, error: saveError } = await supabase
            .from('generated_notes')
            .upsert({
                user_id:        user.id,
                plan_topic_id:  plan_topic_id,
                sub_topic_text: sub_topic_text,
                notes_markdown: notesText,
            }, { onConflict: 'plan_topic_id, sub_topic_text' })
            .select()
            .single();

        if (saveError) throw new Error(`Failed to save note: ${saveError.message}`);

        // ── ILLUSTRATION PIPELINE ─────────────────────────────────────────────
        if (notesText.includes('kalpad-illustration')) {
            await inngest.send({
                name: 'notes/illustration.requested',
                data: { note_id: savedNote.id, user_id: user.id }
            });
        }

        logRouteResult('/api/generate-notes', authMode, 200);
        return new Response(JSON.stringify({ note: savedNote }), { status: 200 });

    } catch (error) {
        console.error('Full error in generate-notes API:', error);
        logRouteResult('/api/generate-notes', authMode, 500);
        return new Response(
            JSON.stringify({ error: error.message || 'An internal error occurred.' }),
            { status: 500 }
        );
    }
}