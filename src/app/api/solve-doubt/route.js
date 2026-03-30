// /src/app/api/solve-doubt/route.js

import { getVertexAIModel } from '@/lib/vertexai';
import { logRouteResult, resolveRouteAuth, unauthorizedResponse } from '@/lib/routeAuth';

// ─────────────────────────────────────────────────────────────────────────────
// ACTION CONFIG
// Each action has its own directive, temperature, and token limit.
// Adding a new action = one new entry here. Nothing else to touch.
// ─────────────────────────────────────────────────────────────────────────────
const ACTION_CONFIG = {
    explain: {
        directive: (examName) =>
            `Explain the highlighted text clearly and precisely at the level expected for "${examName}". ` +
            `Break it down step by step. If there is a common misconception about this, call it out explicitly. ` +
            `End with one sentence that crystallises the core idea.`,
        temperature:     0.35,
        maxOutputTokens: 500,
        needsFullNote:   false,
    },
    analogy: {
        directive: (examName) =>
            `Give one vivid, concrete real-world analogy for the highlighted concept. ` +
            `Calibrate the analogy to a student preparing for "${examName}" — not too basic, not too abstract. ` +
            `After the analogy, add one sentence on where the analogy breaks down so the student doesn't over-extend it.`,
        temperature:     0.7,
        maxOutputTokens: 400,
        needsFullNote:   false,
    },
    importance: {
        directive: (examName) =>
            `Explain exactly why this concept matters for "${examName}". ` +
            `Be specific: What question types does it appear in? What breaks downstream if this concept isn't understood? ` +
            `Do not give generic "this is foundational" answers. Give the actual exam-level reason.`,
        temperature:     0.35,
        maxOutputTokens: 400,
        needsFullNote:   false,
    },
    custom: {
        directive: () =>
            `Answer the user's question directly and concisely. ` +
            `Use the full note content as your primary source of truth. ` +
            `If the answer requires a derivation or worked example, include it.`,
        temperature:     0.5,
        maxOutputTokens: 1500,
        needsFullNote:   true,
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// Tight structural rules — no fluff persona description.
// The KaTeX rule and tone instructions are the only things that produce
// measurable output differences.
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are KalPad, an AI tutor. You give sharp, direct, exam-calibrated answers.

TONE: Conversational and direct. Use "you" and "I". Skip pleasantries. Get to the point fast.
      Be the knowledgeable friend, not the cautious professor.

FORMATTING:
- Respond in clean Markdown.
- Use bullet points for lists, bold for key terms on first use.
- Keep responses tight — every sentence must earn its place.

MATH (CRITICAL):
- Inline math: $...$ — always, no exceptions.
- Display math: $$...$$ — on its own line, with a blank line before and after.
- FORBIDDEN: \\( \\) and \\[ \\] — KaTeX does not support them.
- Escape inside math blocks: \\% \\_ \\& (\\& is fine inside {align}).
- Never nest $$ inside $$.`;

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

function buildQuickActionPrompt(action, highlightedText, context, directive) {
    // context.examName is used by the directive — but we also add it here
    // so the model knows who it's talking to without needing the full note.
    return `I am studying for my **${context.examName}** exam.
Current chapter: "${context.dayTopic}"
Sub-topic I'm on: "${context.subTopic}"

I've highlighted this from my notes:
> "${highlightedText}"

Your task: ${directive}`;
}

function buildCustomPrompt(question, fullNoteContent, context) {
    // Full note is justified here — the user is asking a freeform question
    // that may require understanding the whole note, not just a selection.
    return `I am studying for my **${context.examName}** exam.
Current chapter: "${context.dayTopic}"
Sub-topic: "${context.subTopic}"

Full note content (your primary source of truth):
---
${fullNoteContent}
---

My question: "${question}"`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req) {
    let authMode = 'none';
    try {
        const auth = await resolveRouteAuth(req);
        authMode   = auth.authMode;

        if (!auth.user) {
            logRouteResult('/api/solve-doubt', authMode, 401);
            return unauthorizedResponse();
        }

        const body    = await req.json();
        const payload = body.data || body;

        const { fullNoteContent, highlightedText, question, action, context } = payload;

        // Input validation
        if (!action || !context) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: action and context' }),
                { status: 400 }
            );
        }

        const config = ACTION_CONFIG[action];
        if (!config) {
            return new Response(
                JSON.stringify({ error: `Unknown action: "${action}"` }),
                { status: 400 }
            );
        }

        if (action !== 'custom' && !highlightedText) {
            return new Response(
                JSON.stringify({ error: 'highlightedText is required for this action' }),
                { status: 400 }
            );
        }
        if (action === 'custom' && !question) {
            return new Response(
                JSON.stringify({ error: 'question is required for the custom action' }),
                { status: 400 }
            );
        }

        // Build prompt — quick actions never receive the full note
        const directive  = config.directive(context.examName);
        const userPrompt = action === 'custom'
            ? buildCustomPrompt(question, fullNoteContent, context)
            : buildQuickActionPrompt(action, highlightedText, context, directive);

        const model = await getVertexAIModel('gemini-2.5-flash-lite');

        const response = await model.generateContent({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents:          [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig:  {
                temperature:     config.temperature,
                maxOutputTokens: config.maxOutputTokens,
            },
        });

        const aiResponseText =
            response.response.candidates[0]?.content?.parts[0]?.text ||
            'Sorry, I could not generate a response.';

        logRouteResult('/api/solve-doubt', authMode, 200);
        return new Response(
            JSON.stringify({ response: aiResponseText }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error in /api/solve-doubt:', error);
        const errorMessage =
            error.response?.candidates?.[0]?.finishReason ||
            error.message ||
            'An unknown error occurred.';
        logRouteResult('/api/solve-doubt', authMode, 500);
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
    }
}