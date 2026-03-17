// src/app/api/generate-notes/route.js
//
// ARCHITECTURE: 3-Stage Pedagogical Pipeline
//
//   Stage 0 │ Exam Persona         → Cached per plan. Tells every downstream agent WHO the student is.
//   Stage 1 │ Pedagogical Brief    → Replaces the flat Outliner. Produces teaching INTENT, not just structure.
//            │                       Identifies load-bearing concepts, common misconceptions, analogy anchors,
//            │                       section depth tags, motivated derivation hooks, and connection maps.
//   Stage 2 │ Author Agent         → Receives the Brief and writes with purpose. Every section has an
//            │                       objective, not just a title. Feynman anchors, misconception blocks,
//            │                       symbol glossaries, motivated derivations, and connection footers are
//            │                       all mandatory — not "where appropriate."
//
// KEY FIX: Time prefixes (e.g. "(30 min)") are stripped from sub_topic_text BEFORE any AI call.
//          Study time does not equal note depth. A depth_directive is derived separately from the
//          time annotation and passed as an explicit, unambiguous instruction to both agents.
//          This eliminates the depth-compression bug where the model was inferring
//          "short topic → thin note" from the time prefix.

import { GoogleGenerativeAI } from "@google/generative-ai";
import { inngest } from '@/lib/inngest';
import { getVertexAIModel } from '@/lib/vertexai';
import { logRouteResult, resolveRouteAuth, unauthorizedResponse } from '@/lib/routeAuth';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const dynamic = 'force-dynamic';


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function cleanJSON(text) {
    try {
        let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(clean);
    } catch (e) {
        try {
            const start = text.indexOf('{');
            const end   = text.lastIndexOf('}');
            if (start !== -1 && end !== -1) return JSON.parse(text.substring(start, end + 1));
        } catch (e2) { throw new Error("AI returned malformed JSON."); }
        throw e;
    }
}

/**
 * Strips the time prefix injected by the scheduler (e.g. "(30 min)", "(1.5h)", "(2h)")
 * from sub_topic_text and returns the clean topic string.
 *
 * The time prefix is a study-session duration hint for the student — NOT a signal
 * for how long or shallow the note should be. Passing it raw to the LLM causes
 * the model to infer "short topic → thin note", which is the core depth bug.
 */
function stripTimePrefix(text) {
    // Matches: (30 min), (1h), (1.5h), (2 hours), (45 mins), etc.
    return text.replace(/^\s*\(\s*[\d.]+\s*(?:h|hr|hrs|hour|hours|min|mins|minute|minutes)\s*\)\s*/i, '').trim();
}

/**
 * Derives an explicit depth directive from the raw time annotation.
 * Study time informs depth intent — but the mapping is pedagogical, not proportional.
 * A 30-minute topic still needs a thorough note; it just cannot afford digressions.
 */
function deriveDepthDirective(rawText) {
    const match = rawText.match(/^\s*\(\s*([\d.]+)\s*(h|hr|hrs|hour|hours|min|mins|minute|minutes)\s*\)/i);
    if (!match) return 'STANDARD';

    const value = parseFloat(match[1]);
    const unit  = match[2].toLowerCase();
    const hours = unit.startsWith('h') ? value : value / 60;

    if (hours < 0.75) return 'ESSENTIAL';      // < 45 min: tight, no digressions
    if (hours < 1.75) return 'STANDARD';       // 45 min – 1h45: full treatment
    return 'COMPREHENSIVE';                     // > 1h45: exhaustive coverage
}

/**
 * Per-depth authoring brief. Passed verbatim into the Author prompt so there is
 * no ambiguity about scope — the model receives an explicit instruction, not a
 * number to infer from.
 */
const DEPTH_AUTHOR_BRIEF = {
    ESSENTIAL: `
DEPTH MODE: ESSENTIAL
The student has under 45 minutes for this session. The note must be tight, purposeful, zero-waste.
- Cover ONLY concepts tagged [CORE] in the brief with full depth.
- [SUPPORTING] sections get one tight, dense paragraph each — clear, no padding.
- [ADVANCED] sections may be omitted unless the exam persona explicitly marks them critical.
- Every sentence must earn its place. No historical tangents, no "interesting but not examinable" asides.
- Still non-negotiable: Feynman anchor, misconception block, and Connection Footer for every [CORE] concept.
- Check Your Understanding: exactly 2 questions (one foundational, one application).
- Target: 700–1100 words of dense, purposeful prose.`,

    STANDARD: `
DEPTH MODE: STANDARD
The student has 45 minutes to 1h45. Full pedagogical treatment expected.
- [CORE] sections: thorough, with at least one fully worked example each.
- [SUPPORTING] sections: complete and clear, not padded.
- [ADVANCED] sections: include if the exam persona marks them important; skim otherwise.
- All mandatory elements apply: Feynman anchors, misconception blocks, motivated derivations, symbol glossaries, Connection Footer.
- Check Your Understanding: 3 questions (foundational, standard, application).
- Target: 1300–2200 words.`,

    COMPREHENSIVE: `
DEPTH MODE: COMPREHENSIVE
The student has over 1h45 dedicated to this topic. Write exhaustively.
- [CORE] sections: multiple worked examples of increasing complexity. Derive from scratch.
  Anticipate every likely confusion. Do not leave any "it can be shown that..." gaps.
- [SUPPORTING] sections: full treatment — not summaries.
- [ADVANCED] sections: include completely. These differentiate average scores from top scores.
- All mandatory elements apply at full force. Misconception blocks should go deep.
- Check Your Understanding: 4–5 questions spanning foundational through stretch difficulty.
- Target: 2500–4500 words. Earn every word — depth without padding.`,
};


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — PROMPT BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * STAGE 0 — EXAM PERSONA PROMPT
 * Unchanged from original — it works correctly and is cached after the first call.
 */
function buildPersonaPrompt(examName) {
    return `
You are an expert academic analyst. Based on the following exam name, generate a concise "persona document"
that will guide another AI in writing study notes.

**Exam Name:** "${examName}"

Return a single, valid JSON object with exactly these fields:
- "audience_level": Short description of the target audience (e.g. "Undergraduate, 2nd Year," "Post-graduate, highly competitive," "High School, foundational").
- "key_focus_areas": Array of concepts or skill types critical for this exam (e.g. ["Numerical problem-solving", "Deep theoretical proofs", "Practical applications"]).
- "writing_style": Writing tone directive (e.g. "Highly technical and precise, formal language," "Conceptual and intuitive, use analogies").

**Example for "GATE Electronics":**
{
  "audience_level": "Post-graduate engineering, highly competitive and technical.",
  "key_focus_areas": ["Rapid problem-solving", "In-depth understanding of core theorems", "Application of formulas to complex circuits", "Numerical accuracy"],
  "writing_style": "Assume strong foundational knowledge. Be dense, technical, and focus on examinable points. Use formal, textbook-level language."
}

**Example for "CBSE Class 12 Physics":**
{
  "audience_level": "High school senior, focus on core concepts and board exam patterns.",
  "key_focus_areas": ["Clear definition of terms", "Step-by-step derivation of key formulas", "Solving standard textbook problems", "Understanding of key experiments"],
  "writing_style": "Clear, simple language. Use relatable analogies. Assume no prior knowledge beyond the previous class level."
}
`;
}


/**
 * STAGE 1 — PEDAGOGICAL BRIEF PROMPT
 *
 * Replaces the flat Outliner. Produces teaching INTENT alongside structure.
 * The Author receives not just "what to cover" but:
 *   — why each concept is load-bearing
 *   — the specific misconception students have
 *   — the analogy that makes it click
 *   — what the derivation actually answers
 *   — which section needs 2x effort vs which can be leaner
 *   — how this connects to the exam specifically
 *
 * This single change is responsible for the largest quality jump.
 */
function buildPedagogicalBriefPrompt({ examName, dayTopic, cleanSubTopic, previousContext, examPersona, depthDirective }) {
    return `
You are a master curriculum architect and expert educator with deep knowledge of ${examName}.
Your task is to create a Pedagogical Brief — a rich teaching-intent document — for one study note chapter.
This is NOT the note itself. This brief will be handed to an expert author AI to write the actual notes.

The quality of the final note depends entirely on the quality of this brief.
Think deeply. Be specific to this exact topic and this exact exam. Generic output produces generic notes.

═══════════════════════════════════════════════════════════════════
INPUT CONTEXT
═══════════════════════════════════════════════════════════════════
Exam / Goal:         "${examName}"
Chapter Topic:       "${dayTopic}"
Sub-Topic to Brief:  "${cleanSubTopic}"
Previously Learned:  [${previousContext}]
Depth Mode:          ${depthDirective}

Exam Persona:
${JSON.stringify(examPersona, null, 2)}

═══════════════════════════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════════════════════════
Produce a single valid JSON object — the Pedagogical Brief — with these exact keys:

{
  "chapter_objective": "ONE precise sentence: what the student will be able to DO after reading this note. Must start with an action verb: 'Derive...', 'Apply...', 'Analyse...', 'Explain...'. This is the north star for everything else in the brief.",

  "narrative_hook": "One or two sentences the Author must use to OPEN the note. Must create intellectual curiosity or frame a real problem that this concept solves. Never start with a definition. Example: 'Every time you listen to music on a phone, a Fourier Transform runs thousands of times per second. But what is it actually computing — and why does the math work?' The hook must be calibrated to the audience level in the persona.",

  "load_bearing_concepts": [
    {
      "concept": "Exact concept name as it should appear in the note",
      "depth_tag": "[CORE] or [SUPPORTING] or [ADVANCED]",
      "why_load_bearing": "Precisely why this concept is the hinge point — what breaks downstream in the subject if the student does not fully understand this. Be specific: name the downstream topics or exam question types.",
      "common_misconception": "The single most specific, common wrong intuition students hold about THIS concept. Not 'students find this hard' but: 'Students think X because of Y. This leads them to incorrectly conclude Z in exam questions.' Be precise.",
      "misconception_correction": "The exact correction in 2-3 sentences. Must address both the wrong belief AND the correct mental model. This will appear in the note nearly verbatim.",
      "feynman_anchor": "One sentence that captures the essence of this concept in completely jargon-free language. A bright 15-year-old with no subject knowledge must be able to understand it. If you use a technical word, it fails the test.",
      "analogy": "A specific, relatable analogy calibrated to the audience level in the persona. Include: (a) the full comparison, (b) one sentence on where the analogy holds, (c) one sentence on where it breaks down — students must know the limits to avoid over-extending it.",
      "derivation_motivation": "If this concept involves a derivation: one sentence on what question the derivation answers, and what we could NOT do without this result. If there is no derivation for this concept, set this to null.",
      "worked_example_directive": "Specific, concrete instruction for the worked example type. Do NOT say 'solve a problem'. Say: 'Given a parallel RLC circuit with R=10Ω, L=0.1H, C=100μF, find the resonant frequency and Q-factor. Show each substitution step explicitly.' The more specific, the better the example the Author will produce."
    }
  ],

  "sections": [
    {
      "title": "Section title (will appear as ### in the note)",
      "depth_tag": "[CORE] or [SUPPORTING] or [ADVANCED]",
      "section_objective": "One sentence: what specific understanding the student gains after THIS section only.",
      "must_cover": ["Specific point the Author must not omit — be concrete, not vague", "Another specific point"],
      "must_NOT_do": ["Specific authoring mistake to avoid for this section. E.g.: 'Do not introduce the formula before the student understands the physical intuition for why it takes this form.'"]
    }
  ],

  "connection_map": {
    "direct_prerequisites": ["Specific concept from the Previously Learned list that this note directly builds on. Not generic — name the exact concept."],
    "what_this_unlocks": ["Specific future topics in ${examName} that directly depend on mastering this sub-topic. Name them."],
    "exam_application": "How this sub-topic appears in ${examName} specifically: the question format, the typical trap, the marking pattern, or the most commonly tested application. This must be specific to this exam — not generic exam advice."
  },

  "check_your_understanding": [
    {
      "question": "Full question text — specific enough to have a clear answer",
      "question_type": "conceptual or numerical or derivation or application",
      "what_it_tests": "The precise insight or misconception this question targets. Not 'understanding of the topic' but the specific mental model it probes.",
      "difficulty": "foundational or standard or stretch"
    }
  ],

  "illustration_directives": [
    {
      "after_section": "Title of the section after which this illustration should appear",
      "engine": "mermaid or matplotlib",
      "justified_because": "The specific reason text alone cannot convey this concept — be precise. If text plus a worked example can explain it, it does not deserve an illustration.",
      "description": "Exact, detailed description: axis labels with units, variable names, key inflection points to mark, style notes. The Author must be able to produce this from your description alone."
    }
  ]
}

═══════════════════════════════════════════════════════════════════
STRICT RULES FOR THE BRIEF
═══════════════════════════════════════════════════════════════════
1.  Output ONLY the raw JSON object. No prose before or after. No markdown fences.
2.  load_bearing_concepts must have at least one [CORE] entry. Do not tag everything [CORE] — reserve it for concepts the note cannot work without.
3.  Misconceptions must be specific to THIS concept and THIS exam level. Generic misconceptions are useless.
4.  The feynman_anchor must pass the "bright 15-year-old" test. If it contains jargon, rewrite it.
5.  illustration_directives is optional. If text and examples can explain it, leave the array empty. An illustration placeholder that the student cannot render is worse than no illustration.
6.  check_your_understanding must include at least one question of type "application" — not just recall.
7.  connection_map.exam_application must name the specific exam type, question format, or trap relevant to "${examName}". Not "this is important for the exam."
8.  Calibrate section depth_tags to the depth mode: ${depthDirective}. An ESSENTIAL brief should have fewer [ADVANCED] sections than a COMPREHENSIVE brief.
9.  The sections array must map to a logical pedagogical flow — not alphabetical or arbitrary. The order must reflect how a master teacher would build the concept.
`;
}


/**
 * STAGE 2 — AUTHOR AGENT PROMPT
 *
 * The Author receives the full Pedagogical Brief and writes with complete intent.
 * Every quality element is explicitly mandated — nothing is left to "where appropriate."
 * The brief gives the Author teaching intent at every level so the result reads like
 * Griffiths or Feynman, not an encyclopedia entry.
 */
function buildAuthorPrompt({ examName, dayTopic, cleanSubTopic, previousContext, examPersona, depthDirective, pedagogicalBrief }) {
    const depthBrief = DEPTH_AUTHOR_BRIEF[depthDirective] || DEPTH_AUTHOR_BRIEF.STANDARD;

    return `
You are one of the finest academic authors in the world. Your writing sits between Griffiths,
the Feynman Lectures, and the best university lecture notes — technically impeccable, yet clear
enough that a student can master the topic from your words alone without a teacher.

You have been given a Pedagogical Brief prepared by a master curriculum architect.
Your job is to execute it with precision and bring it to life as a complete study chapter.

This note must be better than a standard textbook on this sub-topic — because unlike a textbook,
you know exactly who this student is, what they already know, and what exam they are facing.
Use every advantage that gives you.

═══════════════════════════════════════════════════════════════════
YOUR CONTEXT
═══════════════════════════════════════════════════════════════════
Exam / Goal:         "${examName}"
Chapter Topic:       "${dayTopic}"
Sub-Topic:           "${cleanSubTopic}"
Previously Learned:  [${previousContext}]

Exam Persona (your primary calibration for tone, depth, and examples):
${JSON.stringify(examPersona, null, 2)}

${depthBrief}

═══════════════════════════════════════════════════════════════════
THE PEDAGOGICAL BRIEF — YOUR COMPLETE BLUEPRINT
═══════════════════════════════════════════════════════════════════
${JSON.stringify(pedagogicalBrief, null, 2)}

═══════════════════════════════════════════════════════════════════
MANDATORY WRITING RULES
ALL of these are non-negotiable. Every single one must appear in the note.
═══════════════════════════════════════════════════════════════════

── OPENING ──────────────────────────────────────────────────────────────

RULE 1 — NARRATIVE HOOK (MANDATORY, FIRST):
  The very first text of the note must be the narrative_hook from the brief.
  Do NOT start with a definition. Do NOT start with "In this chapter, we will study...".
  The hook is the door into the note. Make the student want to walk through it.

RULE 2 — PREREQUISITE BRIDGE (MANDATORY IF previousContext is not "None"):
  The second paragraph must explicitly bridge from the last learned concept to this one.
  Pattern: "In [previousContext], we established [specific idea]. That foundation now lets us
  ask a sharper question: [the question this note answers]."
  Never re-teach the prerequisite — treat it as a known axiom. Build forward from it.

── CONCEPT TREATMENT ────────────────────────────────────────────────────

RULE 3 — FEYNMAN ANCHOR (MANDATORY FOR EVERY [CORE] CONCEPT):
  Before the technical treatment of each [CORE] concept, insert:
  > 💡 **The Core Idea:** [the feynman_anchor from the brief for this concept]
  This must appear BEFORE the formal definition or derivation. Never after.
  This is the cognitive hook that makes everything else stick.

RULE 4 — FORMAL DEFINITION (MANDATORY FOR EVERY KEY TERM):
  Every term introduced for the first time gets:
  > **Definition:** [Precise, formal definition calibrated to the audience level]
  Also **bold** the term at its first occurrence in regular prose.

RULE 5 — MISCONCEPTION BLOCK (MANDATORY FOR EVERY [CORE] CONCEPT):
  Immediately after introducing each [CORE] concept, insert:
  > ⚠️ **Common Misconception:** [the common_misconception from the brief]
  >
  > **Correction:** [the misconception_correction from the brief]
  
  This is the single highest-value element in the entire note for exam performance.
  Students who avoid these traps score significantly higher. Do not skip this.

RULE 6 — MOTIVATED DERIVATION (MANDATORY WHEN derivation_motivation IS NOT NULL):
  Before beginning any derivation, write this in italic on its own line:
  *We derive this because: [what question it answers]. Without this result, we cannot [what fails].*
  Then begin the derivation. Starting a derivation without motivation produces dead algebra
  the student memorises but never understands. Never start a derivation cold.

RULE 7 — SYMBOL GLOSSARY (MANDATORY AFTER EVERY NON-TRIVIAL EQUATION):
  After any equation containing 3 or more distinct symbols, immediately follow with:
  **where** $A$ = [what it represents] ([unit if applicable]), $B$ = [what it represents], ...
  Do this on a single line immediately after the equation. Never assume any symbol is self-evident.
  Students fail exams because they confuse symbols, not because they misunderstood the concept.

RULE 8 — WORKED EXAMPLE (MANDATORY FOR EVERY [CORE] CONCEPT):
  Follow the worked_example_directive in the brief exactly. Format:
  
  ---
  **Worked Example:** [Descriptive title]
  
  **Problem:** [Full problem statement]
  
  **Solution:**
  
  **Step 1:** [What you're doing and why you're doing it first]
  [Working]
  
  **Step 2:** [Next step with reasoning]
  [Working]
  
  [Continue until complete]
  
  **Answer:** [Final result with units]
  
  > 🔑 **Key Insight:** [One sentence on what this example reveals about the concept that the
  > student should carry forward — not just what the answer is]
  ---

RULE 9 — ANALOGY (MANDATORY FOR EVERY [CORE] AND [SUPPORTING] CONCEPT):
  The analogy from the brief must appear in the note. Format:
  "Think of [concept] as [analogy]. [One sentence on where this holds exactly.]
   [One sentence on where the analogy breaks down — essential so students don't over-extend it.]"
  
  Analogies are not decoration. They are the cognitive scaffolding that makes technical content
  retrievable under exam pressure. A student who understands the analogy will reconstruct the
  formula from first principles even if they forget it.

── CLOSING ──────────────────────────────────────────────────────────────

RULE 10 — CONNECTION FOOTER (MANDATORY, SECOND-TO-LAST SECTION):
  Title: ### Connections
  Content (three mandatory subsections):
  
  **Builds on:** [The specific prerequisite concept(s) from connection_map.direct_prerequisites — name them]
  
  **Unlocks:** [The specific future topics from connection_map.what_this_unlocks — name them]
  
  **In ${examName}:** [The exam-specific application from connection_map.exam_application —
  question format, common trap, marking pattern, or most tested form]

RULE 11 — CHECK YOUR UNDERSTANDING (MANDATORY, FINAL SECTION):
  Title: ### Check Your Understanding
  Use the questions from the brief's check_your_understanding array.
  Format each as:
  
  **Q[n] ([question_type] — [difficulty]):** [question text]
  
  Do NOT provide answers or hints in the note. The student must work through these independently.
  These questions are calibrated to the specific misconceptions and insights in this note —
  they are not generic comprehension checks.

── STRUCTURE ─────────────────────────────────────────────────────────────

RULE 12 — SECTION HEADERS:
  Use the section titles from the brief's sections array, in the exact order given.
  Use ### for top-level sections, #### for subsections within a section.
  Do NOT include the overall topic or sub-topic as a title at the top of the note.
  Begin directly with the narrative hook (Rule 1).

RULE 13 — DEPTH COMPLIANCE:
  [CORE] sections: write at the full depth the depth mode allows. No shortcuts.
  [SUPPORTING] sections: complete and clear, proportionally shorter than [CORE].
  [ADVANCED] sections: per the depth mode directive. Include per brief — never pad.
  The must_cover and must_NOT_do fields in each section are your guardrails. Follow them.

RULE 14 — ILLUSTRATIONS:
  Insert a kalpad-illustration block for each entry in the brief's illustration_directives array.
  Place each block immediately after the paragraph explaining the concept it illustrates.
  
  For flowcharts / diagrams:
  \`\`\`kalpad-illustration
  {
    "engine": "mermaid",
    "description": "[Exact description from the illustration directive — do not paraphrase]"
  }
  \`\`\`
  
  For plots / graphs:
  \`\`\`kalpad-illustration
  {
    "engine": "matplotlib",
    "description": "[Exact description from the illustration directive — do not paraphrase]"
  }
  \`\`\`
  
  If illustration_directives is empty in the brief, include no illustrations.
  Do not invent illustrations not specified in the brief.

── LATEX (UNBREAKABLE — KATEX COMPATIBILITY) ────────────────────────────

RULE 15 — DELIMITERS:
  Inline math: \`$ ... $\` only.
  Display math: \`$$ ... $$\` only.
  FORBIDDEN: \\[ ... \\] and \\( ... \\) — KaTeX does not support them.

RULE 16 — ENVIRONMENTS:
  PERMITTED: {matrix}, {pmatrix}, {bmatrix}, {Vmatrix}, {vmatrix}, {align}, {aligned}, {cases}.
  FORBIDDEN: {equation}, {eqnarray}, {gather}, and any non-standard environment.

RULE 17 — SPECIAL CHARACTERS IN MATH:
  Inside any math delimiters, escape: \\% for percent, \\_ for underscore (except inside {align}),
  \\& for ampersand (except inside {align}).

RULE 18 — CORRECTNESS:
  Every opening bracket, brace, or parenthesis must have a matching close.
  Never nest $$ inside $$.

═══════════════════════════════════════════════════════════════════
THE STANDARD YOU ARE WRITING TO
═══════════════════════════════════════════════════════════════════
After a student reads this note, they should be able to:
1. Close the note and explain the concept to someone else in plain language (Feynman anchors did their job).
2. Identify the misconception they would have had without this note, and explain why it is wrong.
3. Reproduce the key derivations with motivation — not just the steps, but why the steps are taken.
4. Solve a previously unseen exam problem on this topic.
5. Know exactly what comes before and after this concept in the larger map of the subject.

If the note achieves all five, it has succeeded.

Write now. Begin with the narrative hook.
`;
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — POST HANDLER
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

        // ── TIME PREFIX SEPARATION ─────────────────────────────────────────────
        // sub_topic_text arrives as e.g. "(30 min) Study Newton's First Law — focus on inertia"
        // Strip the prefix BEFORE any AI call. Depth is derived separately and passed explicitly.
        const cleanSubTopic  = stripTimePrefix(sub_topic_text);
        const depthDirective = deriveDepthDirective(sub_topic_text);

        console.log(`[Notes] Topic: "${cleanSubTopic}" | Depth: ${depthDirective}`);

        // ── CONTEXT RETRIEVAL ──────────────────────────────────────────────────
        const { data: topicData, error: topicError } = await supabase
            .from('plan_topics')
            .select('relevant_page_images, plan_id, day, study_plans ( exam_persona )')
            .eq('id', plan_topic_id)
            .single();

        if (topicError) throw new Error(`Failed to fetch topic data: ${topicError.message}`);

        // Zero-Latency Context: 3 immediately preceding sub-topics in this plan.
        // Time prefixes are also stripped from history so context reads cleanly.
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
                    const prevTopics = allTopics.slice(Math.max(0, currentIndex - 3), currentIndex);
                    if (prevTopics.length > 0) previousContext = prevTopics.join(' → ');
                }
            }
        } catch (e) { console.warn("Context fetch warning:", e); }

        // RAG — kept commented for re-enablement
        // const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
        // const embeddingResult = await embeddingModel.embedContent(cleanSubTopic);
        // const { data: matches } = await supabase.rpc('match_documents', {
        //     query_embedding: embeddingResult.embedding.values,
        //     match_threshold: 0.73, match_count: 5, target_user_id: user.id
        // });
        // const retrievedTextContext = matches?.map(m => m.content).join('\n---\n') || "No context found.";

        // ── STAGE 0: EXAM PERSONA (CACHED PER PLAN) ───────────────────────────
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

        // ── STAGE 1: PEDAGOGICAL BRIEF ────────────────────────────────────────
        // Replaces the flat Outliner. Produces teaching intent alongside structure.
        // The Author receives WHY each concept matters, not just WHAT to cover.
        console.log(`[Notes] Stage 1: Generating Pedagogical Brief...`);

        const briefResult = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [{ text: buildPedagogicalBriefPrompt({
                    examName:        exam_name,
                    dayTopic:        day_topic,
                    cleanSubTopic,
                    previousContext,
                    examPersona,
                    depthDirective,
                }) }]
            }]
        });

        const briefRaw = briefResult.response.candidates[0].content.parts[0].text;
        let pedagogicalBrief;
        try {
            pedagogicalBrief = cleanJSON(briefRaw);
        } catch (e) {
            throw new Error("The Pedagogical Brief agent returned malformed JSON. Cannot proceed to authoring.");
        }

        // Structural validation — if the brief is empty or broken, fail fast rather than
        // producing a shallow note. Better to surface the error than to silently degrade.
        if (!pedagogicalBrief?.sections?.length || !pedagogicalBrief?.load_bearing_concepts?.length) {
            throw new Error("The Pedagogical Brief is incomplete. The topic may be too abstract or have insufficient context. Try rephrasing the sub-topic.");
        }

        console.log(`[Notes] Brief: ${pedagogicalBrief.sections.length} sections | ${pedagogicalBrief.load_bearing_concepts.length} concepts`);

        // ── STAGE 2: AUTHOR AGENT ─────────────────────────────────────────────
        // Receives the full brief and writes with complete pedagogical intent.
        // All mandatory elements are explicitly required — nothing is "where appropriate."
        console.log(`[Notes] Stage 2: Authoring note (depth: ${depthDirective})...`);

        const authorResult = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [{ text: buildAuthorPrompt({
                    examName:         exam_name,
                    dayTopic:         day_topic,
                    cleanSubTopic,
                    previousContext,
                    examPersona,
                    depthDirective,
                    pedagogicalBrief,
                }) }]
            }]
        });

        const notesText = authorResult.response.candidates[0].content.parts[0].text;

        if (!notesText || notesText.trim().length < 100) {
            throw new Error("The Author agent failed to generate a sufficiently detailed note. Please try again.");
        }

        console.log(`[Notes] Complete. ${notesText.length} chars.`);

        // ── DATABASE WRITE ────────────────────────────────────────────────────
        // Store original sub_topic_text (with time prefix) as the record key
        // so it matches what the frontend sent — cleanSubTopic is internal only.
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