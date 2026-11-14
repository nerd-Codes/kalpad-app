// src/lib/byok/pipelines/doubtSolver.js
/**
 * Client-side Doubt Resolution & Inline Tutor powered by ChatGPT BYOK quota.
 * Uses configured modelPreferences.doubtModel.
 */

import { ensureByokConnected, resolveModelForTask, streamResponsesChat } from '../openai.js';

const ACTION_CONFIG = {
  explain: {
    directive: (examName) =>
      `Explain the highlighted text clearly and precisely at the level expected for "${examName}". ` +
      `Break it down step by step. If there is a common misconception about this, call it out explicitly. ` +
      `End with one sentence that crystallises the core idea.`,
  },
  analogy: {
    directive: (examName) =>
      `Give one vivid, concrete real-world analogy for the highlighted concept. ` +
      `Calibrate the analogy to a student preparing for "${examName}" — not too basic, not too abstract. ` +
      `After the analogy, add one sentence on where the analogy breaks down so the student doesn't over-extend it.`,
  },
  importance: {
    directive: (examName) =>
      `Explain exactly why this concept matters for "${examName}". ` +
      `Be specific: What question types does it appear in? What breaks downstream if this concept isn't understood? ` +
      `Do not give generic "this is foundational" answers. Give the actual exam-level reason.`,
  },
  custom: {
    directive: () =>
      `Answer the user's question directly and concisely. ` +
      `Use the full note content as your primary source of truth. ` +
      `If the answer requires a derivation or worked example, include it.`,
  },
};

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

function buildQuickActionPrompt(action, highlightedText, context, directive) {
  return `I am studying for my **${context.examName}** exam.
Current chapter: "${context.dayTopic}"
Sub-topic I'm on: "${context.subTopic}"

I've highlighted this from my notes:
> "${highlightedText}"

Your task: ${directive}`;
}

function buildCustomPrompt(question, fullNoteContent, context) {
  return `I am studying for my **${context.examName}** exam.
Current chapter: "${context.dayTopic}"
Sub-topic: "${context.subTopic}"

Full note content (your primary source of truth):
---
${fullNoteContent || ''}
---

My question: "${question}"`;
}

/**
 * Resolves a study doubt using user's connected ChatGPT plan quota.
 * Supports optional streaming callback onDelta.
 *
 * @param {Object} params
 * @param {string} [params.fullNoteContent]
 * @param {string} [params.highlightedText]
 * @param {string} [params.question]
 * @param {'explain'|'analogy'|'importance'|'custom'} params.action
 * @param {{ examName: string, dayTopic: string, subTopic: string }} params.context
 * @param {(delta: string) => void} [params.onDelta]
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<{ response: string }>}
 */
export async function solveDoubtBYOK({
  fullNoteContent,
  highlightedText,
  question,
  action,
  context,
  onDelta,
  signal,
}) {
  if (!action || !context) {
    throw new Error('Missing required fields: action and context');
  }
  const config = ACTION_CONFIG[action];
  if (!config) {
    throw new Error(`Unknown action: "${action}"`);
  }
  if (action !== 'custom' && !highlightedText) {
    throw new Error('highlightedText is required for this action');
  }
  if (action === 'custom' && !question) {
    throw new Error('question is required for the custom action');
  }

  const token = await ensureByokConnected();
  const model = await resolveModelForTask('doubtModel', { accessToken: token });

  const directive = config.directive(context.examName);
  const userPrompt =
    action === 'custom'
      ? buildCustomPrompt(question, fullNoteContent, context)
      : buildQuickActionPrompt(action, highlightedText, context, directive);

  let accumulated = '';
  let capturedError = null;

  await streamResponsesChat({
    accessToken: token,
    model,
    input: [{ role: 'user', content: userPrompt }],
    instructions: SYSTEM_PROMPT,
    signal,
    onDelta: (delta) => {
      if (typeof delta === 'string') {
        accumulated += delta;
        onDelta?.(delta, accumulated);
      }
    },
    onCompleted: () => {},
    onError: (err) => {
      capturedError = err;
    },
  });

  if (capturedError) {
    if (capturedError instanceof Error) throw capturedError;
    const errObj = new Error(capturedError?.message || 'Doubt resolution failed.');
    errObj.code = capturedError?.code;
    errObj.isUsageLimit = Boolean(capturedError?.isUsageLimit);
    throw errObj;
  }

  return { response: accumulated };
}
