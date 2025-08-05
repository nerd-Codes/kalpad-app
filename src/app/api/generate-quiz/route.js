// src/app/api/generate-quiz/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
          const supabase = createRouteHandlerClient({ cookies });
      let session;

      // First, try to get user from the mobile app's JWT in the Authorization header
      const authHeader = request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
          const jwt = authHeader.replace('Bearer ', '');
          const { data: { user } } = await supabase.auth.getUser(jwt);
          // If the JWT is valid, we create a session object
          if (user) {
              session = { user }; 
          }
      }

      // If there was no valid mobile session, fall back to the web app's cookie method
      if (!session) {
          const { data } = await supabase.auth.getSession();
          session = data.session;
      }

      // If we still don't have a session after checking both methods, deny access
      if (!session) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }

    const { plan_topic_id } = await request.json();
    if (!plan_topic_id) return new Response(JSON.stringify({ error: 'Topic ID is required' }), { status: 400 });

    const { data: topicData, error: topicError } = await supabase
      .from('plan_topics')
      .select('topic_name, sub_topics')
      .eq('id', plan_topic_id)
      .single();
    if (topicError) throw new Error(`Failed to fetch topic: ${topicError.message}`);
    
    // Use the sub-topics as the basis for the quiz
    const subTopicTexts = topicData.sub_topics.map(sub => sub.text).join(', ');

    const prompt = `
      You are a JSON-only API that creates quizzes.
      
      **Topic:** ${topicData.topic_name}
      **Specific Sub-Topics:** ${subTopicTexts}

      **CRITICAL INSTRUCTIONS:**
      1. Create a multiple-choice quiz with exactly 5 questions based on the provided sub-topics.
      2. The questions should test for genuine understanding, not just rote memorization.
      3. For each question, provide 4 options. One must be correct.
      4. Your entire output MUST be a valid JSON object that adheres strictly to the following schema.

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

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // Flash is perfect for this structured task
      generationConfig: { responseMimeType: "application/json" },
    });

    const result = await model.generateContent(prompt);
    const quizData = JSON.parse(result.response.text());

    return new Response(JSON.stringify(quizData), { status: 200 });

  } catch (error) {
    console.error('Full error in generate-quiz API:', error);
    return new Response(JSON.stringify({ error: error.message || 'An internal error occurred.' }), { status: 500 });
  }
}