// src/lib/byok/pipelines/quizEngine.js
/**
 * Client-side Quiz Generation & Evaluation Engine powered by ChatGPT BYOK quota.
 * Granular Model Routing:
 *   - Question Generation -> modelPreferences.quizModel
 *   - Evaluation/Feedback -> modelPreferences.quizEvaluationModel
 */

import supabase from '../../supabaseClient.js';
import { ensureByokConnected, generateText, resolveModelForTask } from '../openai.js';
import { parseAiJson, sanitizeDoubleEscapedLatex } from '../jsonSanitizer.js';

const QUIZ_KATEX_RULES = `**LATEX STYLE GUIDE (UNBREAKABLE FOR KATEX COMPATIBILITY):**
1. Use only \`$...$\` for inline math and \`$$...$$\` for display math.
2. Do NOT use \`\\(...\\)\` or \`\\[...\\]\`.
3. Allowed environments only: \`{matrix}\`, \`{pmatrix}\`, \`{bmatrix}\`, \`{Vmatrix}\`, \`{vmatrix}\`, \`{align}\`, \`{aligned}\`, \`{cases}\`.
4. Do NOT use unsupported environments like \`{equation}\`, \`{eqnarray}\`, or \`{gather}\`.
5. Use common vanilla LaTeX commands only.
6. Inside math, escape special chars: \`\\%\`, \`\\_\`, and \`\\&\` (except \`\\&\` inside \`align/aligned\` columns).
7. Ensure brackets/braces/parentheses are balanced and never nest \`$$...$$\` inside \`$$...$$\`.`;

/**
 * Generates diagnostic MCQs for a topic directly via user's connected ChatGPT quota.
 *
 * @param {{ planTopicId: number|string, questionCount: number, quizMode: string, signal?: AbortSignal }} params
 * @returns {Promise<{ questions: Array<Object> }>}
 */
export async function generateQuizBYOK({
  planTopicId,
  questionCount,
  quizMode,
  signal,
}) {
  if (!planTopicId || !questionCount || !quizMode) {
    throw new Error('Topic ID, question count, and quiz mode are required.');
  }

  const token = await ensureByokConnected();
  const model = await resolveModelForTask('quizModel', { accessToken: token });

  const { data: topicData, error: topicError } = await supabase
    .from('plan_topics')
    .select('topic_name, sub_topics, plan:study_plans(exam_name)')
    .eq('id', planTopicId)
    .single();

  if (topicError) {
    throw new Error(`Failed to fetch topic: ${topicError.message}`);
  }

  const subTopicTexts = (topicData.sub_topics || []).map((sub) => sub.text).join(', ');

  const prompt = `You are an expert educator and AI quiz master. Your task is to generate a high-quality, engaging quiz based on a student's study topic and preferred learning mode.

**Context:**
- Exam: "${topicData.plan?.exam_name || 'Exam'}"
- Main Topic for Today: "${topicData.topic_name}"
- Specific Sub-Topics to be Quizzed On: "${subTopicTexts}"

**Quiz Parameters:**
- Number of Questions: ${questionCount}
- Quiz Mode: "${quizMode}"

**CRITICAL INSTRUCTIONS:**
1. Generate a multiple-choice quiz with exactly ${questionCount} questions.
2. Tailor the questions to the **Quiz Mode**:
   - **'Rapid Fire'**: Focus on definitions, key terms, and quick-recall facts.
   - **'Core Concepts'**: Focus on "why" and "how" questions that test deep, foundational understanding.
   - **'Problem Solving'**: Focus on application-based questions that require calculation or scenario analysis.
3. For each question, provide exactly 4 options. One must be correct.
4. Ensure the options are plausible and challenging.
5. Question text and options may use clean Markdown and LaTeX where helpful.
6. Return ONLY valid JSON (no markdown fences) adhering strictly to the schema below.

${QUIZ_KATEX_RULES}

**JSON ESCAPING RULE (MANDATORY):**
Because output is JSON, every LaTeX backslash must be double-escaped in string values.

**JSON Schema:**
{
  "questions": [
    {
      "question_text": "string",
      "options": [ "string", "string", "string", "string" ],
      "correct_answer": "string"
    }
  ]
}`;

  const rawText = await generateText({
    accessToken: token,
    model,
    prompt,
    developerInstructions: 'Return strictly valid JSON matching the requested quiz schema.',
    signal,
  });

  const quizData = parseAiJson(rawText);
  const questions = (Array.isArray(quizData?.questions) ? quizData.questions : []).map((q) => ({
    ...q,
    question_text: sanitizeDoubleEscapedLatex(q.question_text || ''),
    options: Array.isArray(q.options) ? q.options.map((o) => sanitizeDoubleEscapedLatex(String(o))) : [],
    correct_answer: sanitizeDoubleEscapedLatex(String(q.correct_answer || '')),
  }));

  if (questions.length === 0) {
    throw new Error('Failed to parse valid quiz questions from AI output.');
  }

  return { questions };
}

/**
 * Evaluates student quiz attempts deterministically, generates explanations for incorrect answers
 * using modelPreferences.quizEvaluationModel, and saves the quiz session + attempts to Supabase.
 *
 * @param {{ planTopicId: number|string, quizMode: string, attempts: Array<Object>, signal?: AbortSignal }} params
 * @returns {Promise<{ score: number, feedback_summary: string, full_results: Array<Object> }>}
 */
export async function evaluateQuizSubmissionBYOK({
  planTopicId,
  quizMode,
  attempts,
  signal,
}) {
  if (!planTopicId || !Array.isArray(attempts) || attempts.length === 0 || !quizMode) {
    throw new Error('Topic ID, quiz mode, and attempts are required.');
  }

  let correctCount = 0;
  const wrongAnswers = [];
  attempts.forEach((attempt) => {
    if (attempt.is_correct) {
      correctCount += 1;
    } else {
      wrongAnswers.push({
        question: attempt.question_text,
        your_answer: attempt.user_answer,
        correct_answer: attempt.correct_answer,
      });
    }
  });

  const score = Math.round((correctCount / attempts.length) * 100);
  let aiFeedbackSummary = "Great work! You've mastered this topic.";
  let explanations = [];

  // 100% score fast-path skips LLM call completely to preserve ChatGPT quota
  if (wrongAnswers.length > 0) {
    const token = await ensureByokConnected();
    const model = await resolveModelForTask('quizEvaluationModel', { accessToken: token });

    const prompt = `You are an AI Teaching Assistant. A student has completed a quiz. Your task is to provide explanations for their incorrect answers and a summary of their performance.

**Incorrectly Answered Questions:**
${JSON.stringify(wrongAnswers, null, 2)}

**CRITICAL INSTRUCTIONS:**
1. For each incorrect question, provide a concise, helpful explanation of **why** the user's answer was wrong and **why** the correct answer is right.
2. Write a brief, encouraging overall feedback summary (2-3 sentences) identifying key concepts to revisit.
3. Explanations may use clean Markdown and LaTeX where helpful.
4. Return ONLY valid JSON (no markdown fences) adhering strictly to the schema below.

${QUIZ_KATEX_RULES}

**JSON Schema:**
{
  "explanations": [
    {
      "question": "The original question text",
      "explanation": "Your detailed explanation for this specific question."
    }
  ],
  "feedback_summary": "Your overall performance summary."
}`;

    try {
      const rawText = await generateText({
        accessToken: token,
        model,
        prompt,
        developerInstructions: 'Return strictly valid JSON with explanations and feedback_summary.',
        signal,
      });
      const aiData = parseAiJson(rawText);
      aiFeedbackSummary = sanitizeDoubleEscapedLatex(
        aiData?.feedback_summary || `You scored ${score}%. Review your missed concepts carefully.`
      );
      explanations = (Array.isArray(aiData?.explanations) ? aiData.explanations : []).map((ex) => ({
        question: ex.question,
        explanation: sanitizeDoubleEscapedLatex(ex.explanation || ''),
      }));
    } catch (err) {
      if (err?.isUsageLimit) throw err;
      aiFeedbackSummary = `You scored ${score}%. Review the key concepts for the questions you missed.`;
    }
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) {
    throw new Error('Sign in required to save quiz results.');
  }

  const { data: sessionData, error: sessionError } = await supabase
    .from('quiz_sessions')
    .insert({
      user_id: userId,
      plan_topic_id: planTopicId,
      score,
      ai_feedback_summary: aiFeedbackSummary,
      quiz_mode: quizMode,
    })
    .select()
    .single();

  if (sessionError) {
    throw new Error(`DB Error (session): ${sessionError.message}`);
  }

  const attemptsToInsert = attempts.map((attempt) => {
    const explanation =
      explanations.find((ex) => ex.question === attempt.question_text)?.explanation ||
      (attempt.is_correct ? null : `The correct answer is: ${attempt.correct_answer}.`);

    return {
      session_id: sessionData.id,
      question_text: attempt.question_text,
      options: attempt.options,
      user_answer: attempt.user_answer,
      correct_answer: attempt.correct_answer,
      is_correct: attempt.is_correct,
      ai_explanation: explanation,
    };
  });

  const { error: attemptsError } = await supabase.from('quiz_attempts').insert(attemptsToInsert);
  if (attemptsError) {
    throw new Error(`DB Error (attempts): ${attemptsError.message}`);
  }

  return {
    score,
    feedback_summary: aiFeedbackSummary,
    full_results: attemptsToInsert,
  };
}
