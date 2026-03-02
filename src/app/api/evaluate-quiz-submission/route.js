// src/app/api/evaluate-quiz-submission/route.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getVertexAIModel } from '@/lib/vertexai';
import { logRouteResult, resolveRouteAuth, unauthorizedResponse } from '@/lib/routeAuth';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const dynamic = 'force-dynamic';

export async function POST(request) {
  let authMode = 'none';
  try {
    const auth = await resolveRouteAuth(request);
    authMode = auth.authMode;
    const { supabase, user } = auth;
    if (!user) {
      logRouteResult('/api/evaluate-quiz-submission', authMode, 401);
      return unauthorizedResponse();
    }

    const { plan_topic_id, quiz_mode, attempts } = await request.json();
    if (!plan_topic_id || !attempts || !quiz_mode) {
      return new Response(JSON.stringify({ error: 'Topic ID, quiz mode, and attempts are required' }), { status: 400 });
    }

    // 1. Calculate Score and identify wrong answers
    let correctCount = 0;
    const wrongAnswers = [];
    attempts.forEach(attempt => {
        if (attempt.is_correct) {
            correctCount++;
        } else {
            wrongAnswers.push({
                question: attempt.question_text,
                your_answer: attempt.user_answer,
                correct_answer: attempt.correct_answer
            });
        }
    });
    const score = Math.round((correctCount / attempts.length) * 100);

    // 2. Generate AI Feedback and Explanations
    let aiFeedbackSummary = "Great work! You've mastered this topic.";
    let explanations = [];

    if (wrongAnswers.length > 0) {
        const prompt = `
            You are an AI Teaching Assistant. A student has completed a quiz. Your task is to provide explanations for their incorrect answers and a summary of their performance.

            **Incorrectly Answered Questions:**
            ${JSON.stringify(wrongAnswers, null, 2)}

            **CRITICAL INSTRUCTIONS:**
            1.  For each incorrect question, provide a concise, helpful explanation of **why** the user's answer was wrong and **why** the correct answer is right.
            2.  After providing explanations, write a brief, encouraging overall feedback summary (2-3 sentences). Identify the key concepts or topics the student should revisit based on their errors.
            3.  Your entire output MUST be a valid JSON object that adheres strictly to the following schema.

            **JSON Schema:**
            {
                "explanations": [
                    {
                        "question": "The original question text",
                        "explanation": "Your detailed explanation for this specific question."
                    }
                ],
                "feedback_summary": "Your overall performance summary."
            }
        `;
            const model = await getVertexAIModel('gemini-2.5-flash-lite', { 
            responseMimeType: "application/json" 
            });

            const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });

            const aiData = JSON.parse(result.response.candidates[0].content.parts[0].text);
            aiFeedbackSummary = aiData.feedback_summary;
            explanations = aiData.explanations;
    }
    
    // 3. Save everything to the database in a single transaction
    const { data: sessionData, error: sessionError } = await supabase
      .from('quiz_sessions')
      .insert({
        user_id: user.id,
        plan_topic_id,
        score,
        ai_feedback_summary: aiFeedbackSummary,
        quiz_mode
      }).select().single();
    if (sessionError) throw new Error(`DB Error (session): ${sessionError.message}`);

    const attemptsToInsert = attempts.map(attempt => {
        const explanation = explanations.find(ex => ex.question === attempt.question_text)?.explanation || null;
        return {
            session_id: sessionData.id,
            question_text: attempt.question_text,
            options: attempt.options,
            user_answer: attempt.user_answer,
            correct_answer: attempt.correct_answer,
            is_correct: attempt.is_correct,
            ai_explanation: explanation
        };
    });
    const { error: attemptsError } = await supabase.from('quiz_attempts').insert(attemptsToInsert);
    if (attemptsError) throw new Error(`DB Error (attempts): ${attemptsError.message}`);

    // 4. Return the full results object to the frontend
    logRouteResult('/api/evaluate-quiz-submission', authMode, 200);
    return new Response(JSON.stringify({
        score,
        feedback_summary: aiFeedbackSummary,
        full_results: attemptsToInsert
    }), { status: 200 });

  } catch (error) {
    console.error('Full error in evaluate-quiz-submission API:', error);
    logRouteResult('/api/evaluate-quiz-submission', authMode, 500);
    return new Response(JSON.stringify({ error: error.message || 'An internal error occurred.' }), { status: 500 });
  }
}
