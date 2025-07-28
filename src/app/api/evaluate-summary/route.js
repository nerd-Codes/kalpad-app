// src/app/api/evaluate-summary/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { plan_topic_id, user_summary } = await request.json();
    if (!plan_topic_id || !user_summary) {
      return new Response(JSON.stringify({ error: 'Topic ID and summary are required' }), { status: 400 });
    }

    const { data: topicData, error: topicError } = await supabase
      .from('plan_topics')
      .select('topic_name, sub_topics')
      .eq('id', plan_topic_id)
      .single();
    if (topicError) throw new Error(`Failed to fetch topic: ${topicError.message}`);
    
    const subTopicTexts = topicData.sub_topics.map(sub => sub.text).join(', ');

    const prompt = `
      You are a helpful and fair AI teaching assistant. Your task is to evaluate a student's summary of what they've learned.

      **Subject Matter:**
      - Main Topic: "${topicData.topic_name}"
      - Specific Sub-Topics Covered: "${subTopicTexts}"

      **Student's Summary:**
      ---
      "${user_summary}"
      ---

      **CRITICAL INSTRUCTIONS:**
      1.  Read the student's summary carefully.
      2.  Evaluate it for accuracy and completeness based on the sub-topics provided.
      3.  Provide a score from 0 to 100, where 100 is a perfect, comprehensive summary.
      4.  Provide a single, concise sentence of constructive feedback. Be encouraging but helpful.
      5.  Your entire output MUST be a valid JSON object adhering to the following schema.

      **JSON Schema:**
      {
        "score": number,
        "feedback": "string"
      }
    `;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
      generationConfig: { responseMimeType: "application/json" },
    });

    const result = await model.generateContent(prompt);
    const evaluation = JSON.parse(result.response.text());

    return new Response(JSON.stringify(evaluation), { status: 200 });

  } catch (error) {
    console.error('Full error in evaluate-summary API:', error);
    return new Response(JSON.stringify({ error: error.message || 'An internal error occurred.' }), { status: 500 });
  }
}