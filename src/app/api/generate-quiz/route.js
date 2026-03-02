// src/app/api/generate-quiz/route.js
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
      logRouteResult('/api/generate-quiz', authMode, 401);
      return unauthorizedResponse();
    }

    // --- DEFINITIVE UPGRADE: ACCEPT NEW PARAMETERS ---
    const { plan_topic_id, question_count, quiz_mode } = await request.json();
    if (!plan_topic_id || !question_count || !quiz_mode) {
      return new Response(JSON.stringify({ error: 'Topic ID, question count, and quiz mode are required' }), { status: 400 });
    }

    const { data: topicData, error: topicError } = await supabase
      .from('plan_topics')
      .select('topic_name, sub_topics, plan:study_plans(exam_name)') // Fetch exam_name for context
      .eq('id', plan_topic_id)
      .single();
    if (topicError) throw new Error(`Failed to fetch topic: ${topicError.message}`);
    
    const subTopicTexts = topicData.sub_topics.map(sub => sub.text).join(', ');

    // --- DEFINITIVE UPGRADE: THE NEW, SMARTER PROMPT ---
    const prompt = `
      You are an expert educator and AI quiz master. Your task is to generate a high-quality, engaging quiz based on a student's study topic and preferred learning mode.

      **Context:**
      - Exam: "${topicData.plan.exam_name}"
      - Main Topic for Today: "${topicData.topic_name}"
      - Specific Sub-Topics to be Quizzed On: "${subTopicTexts}"

      **Quiz Parameters:**
      - Number of Questions: ${question_count}
      - Quiz Mode: "${quiz_mode}"

      **CRITICAL INSTRUCTIONS:**
      1.  Generate a multiple-choice quiz with exactly ${question_count} questions.
      2.  Tailor the questions to the **Quiz Mode**:
          - **'Rapid Fire'**: Focus on definitions, key terms, and quick-recall facts.
          - **'Core Concepts'**: Focus on "why" and "how" questions that test deep, foundational understanding.
          - **'Problem Solving'**: Focus on application-based questions that require calculation or scenario analysis.
      3.  For each question, provide exactly 4 options. One must be correct.
      4.  Ensure the options are plausible and challenging.
      5.  Your entire output MUST be a valid JSON object that adheres strictly to the following schema.

      **JSON Schema:**
      {
        "questions": [
          {
            "question_text": "string",
            "options": [ "string", "string", "string", "string" ],
            "correct_answer": "string" 
          }
        ]
      }
    `;

    // REPLACE WITH THIS BLOCK
    const model = await getVertexAIModel('gemini-2.5-flash', { 
      responseMimeType: "application/json" 
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const quizData = JSON.parse(result.response.candidates[0].content.parts[0].text);

    logRouteResult('/api/generate-quiz', authMode, 200);
    return new Response(JSON.stringify(quizData), { status: 200 });

  } catch (error) {
    console.error('Full error in generate-quiz API:', error);
    logRouteResult('/api/generate-quiz', authMode, 500);
    return new Response(JSON.stringify({ error: error.message || 'An internal error occurred.' }), { status: 500 });
  }
}
