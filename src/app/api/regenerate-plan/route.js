// src/api/regenerate-plan/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const dynamic = 'force-dynamic';

// Note: The imageUrlToGenerativePart helper is NOT needed in this file
// because we are only passing text context to the AI.

const KalPad_Constitution = `
  You are KalPad, an expert AI study mentor. Your mission is to create the most effective, realistic, and motivating study plan possible. You are a strategist, not just a scheduler.
  **Your Core Principles:**
  1.  **Prioritize Recovery:** Your primary goal is to reschedule incomplete topics while still trying to cover the remaining syllabus.
  2.  **Be Realistic & Transparent:** Acknowledge the tighter timeframe. Explain your new strategy clearly. If you now have to skip topics, you MUST explain why.
  3.  **Provide Depth:** Maintain the same high level of detail in the daily "sub_topics" (3-5 actionable tasks). Do not be lazy.
`;

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { plan_id, user_feedback } = await request.json();
    if (!plan_id) return new Response(JSON.stringify({ error: 'Plan ID is required' }), { status: 400 });

    // Fetch the existing plan, its topics, AND the crucial original syllabus
    const { data: existingPlan, error: fetchError } = await supabase
      .from('study_plans')
      .select('*, plan_topics(*)')
      .eq('id', plan_id)
      .eq('user_id', session.user.id)
      .single();
    if (fetchError) throw new Error(`Failed to fetch plan: ${fetchError.message}`);

    // Correct, timezone-safe date calculation
    const today = new Date();
    const startDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000 )).toISOString().split("T")[0];
    const examDateObj = new Date(existingPlan.exam_date);
    const daysLeft = Math.max(1, Math.ceil((examDateObj.getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));

    // Calculate incomplete topics from past days
    const completedTopics = [];
    const incompletePastTopics = [];
    existingPlan.plan_topics.forEach(day => {
        const dayDate = new Date(day.date);
        if (dayDate <= today && day.sub_topics) { // Look at today and all past days
            day.sub_topics.forEach(sub => {
                if (sub.completed) {
                    completedTopics.push(sub.text);
                } else if (dayDate < today) { // Only count as "missed" if it's from a past day
                    incompletePastTopics.push(sub.text);
                }
            });
        }
    });
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-latest", generationConfig: { responseMimeType: "application/json" } });

    // AI Call #1: Regenerate the STRATEGY
    const strategyPrompt = `
      ${KalPad_Constitution}
      **Your Task:** A student needs to regenerate their plan. Create a NEW high-level strategy report in a strict JSON format.
      
      **Original Situation:**
      - Original Strategy: ${existingPlan.generation_context || 'None'}
      - Original Syllabus: ${existingPlan.syllabus}
      
      **Current Situation:**
      - Days Remaining: ${daysLeft}
      - Topics Successfully Completed So Far: ${completedTopics.join(', ') || 'None yet'}
      - Incomplete Topics from Past Days (Must be rescheduled): ${incompleteSubTopics.join(', ') || 'None'}
      - Student's New Feedback (Highest Priority): "${user_feedback || 'No specific feedback.'}"

      **CRITICAL JSON SCHEMA:**
      Your output must be a single JSON object. Your "overall_approach" MUST estimate the new, realistic syllabus coverage percentage. Your JSON must contain "overall_approach", "emphasized_topics", and "skipped_topics".
    `;

    const strategyModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
    const strategyResult = await strategyModel.generateContent(strategyPrompt);
    const newStrategy = JSON.parse(strategyResult.response.text());

    // AI Call #2: Generate the new PLAN Topics
     // This is the final, polished planPrompt for /api/regenerate-plan/route.js

const planPrompt = `
  ${KalPad_Constitution}

  **Your Task:**
  Execute the provided NEW strategy and create a detailed, day-by-day plan in a strict JSON array format. Your primary goal is to provide thoughtful, actionable sub-topics.

  **New Strategy to Execute:**
  - New Approach: ${newStrategy.overall_approach}
  - Incomplete Topics that MUST be Rescheduled: ${incompleteSubTopics.join(', ') || 'None'}

  **Plan Details:**
  - Days Remaining: ${daysLeft}
  - Start Date: ${startDate}
  
  **CRITICAL INSTRUCTIONS for "sub_topics":**
  The "sub_topics" array is the most important part of your output. It MUST contain small, concrete, and actionable tasks that a student can complete in a single session (e.g., 15-45 minutes).
  - BAD Sub-Topic (too broad): "Understand the chapter on Transformers."
  - GOOD Sub-Topic (actionable): "Read pages 45-51 of the textbook about transformer principles."
  - GOOD Sub-Topic (actionable): "Solve 5 practice problems on the transformer EMF equation."
  - GOOD Sub-Topic (actionable): "Create a summary flashcard for the different types of transformer losses."
  
  **CRITICAL INSTRUCTIONS for JSON SCHEMA (Return ONLY a valid JSON array):**
  Each object must have ALL keys:
  - "day": MUST be a whole number (integer).
  - "date": MUST be a string in "YYYY-MM-DD" format.
  - "topic_name": MUST be a string.
  - "study_hours": MUST be a whole number (integer). DO NOT use decimals like 4.5.
  - "importance": MUST be a whole number (integer) from 1 to 10. DO NOT use words like "High".
  - "sub_topics": MUST be an array of objects, each with "text"(string) and "completed"(boolean: false).
`;

    const plannerModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
    const planResult = await plannerModel.generateContent(planPrompt);
    let newPlanTopics = JSON.parse(planResult.response.text());

    if (!Array.isArray(newPlanTopics)) { newPlanTopics = [newPlanTopics]; }

    const isValid = newPlanTopics.every(topic => typeof topic.day === 'number' && topic.topic_name);
    if (!isValid || newPlanTopics.length === 0) {
      throw new Error("The AI failed to generate a valid regenerated plan.");
    }

    // Re-associate images for the new plan topics using semantic search
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    for (const topic of newPlanTopics) {
        const embeddingResult = await embeddingModel.embedContent(topic.topic_name);
        const { data: images, error } = await supabase.rpc('match_images', {
            query_embedding: embeddingResult.embedding.values,
            match_threshold: 0.7,
            match_count: 2,
            target_user_id: session.user.id
        });
        if (error) {
            console.error(`Error matching images for topic "${topic.topic_name}":`, error);
            topic.relevant_page_images = [];
        } else {
            topic.relevant_page_images = images.map(img => 
                supabase.storage.from('study-materials').getPublicUrl(img.file_path).data.publicUrl
            );
        }
    }

    // Atomically archive the old plan and create the new one
    const { data: newPlanId, error: rpcError } = await supabase.rpc('archive_and_create_new_plan', {
        old_plan_id: plan_id,
        new_exam_name: existingPlan.exam_name,
        new_exam_date: existingPlan.exam_date,
        new_context: JSON.stringify(newStrategy),
        new_topics: newPlanTopics
    });
    if (rpcError) throw new Error(`Database error during regeneration: ${rpcError.message}`);
    
    return new Response(JSON.stringify({ 
        message: 'Plan regenerated successfully',
        newPlanId: newPlanId,
        newStrategy: newStrategy
    }), { status: 200 });
  } catch (error) {
    console.error('Full error in regenerate-plan API:', error);
    return new Response(JSON.stringify({ error: error.message || 'An internal error occurred.' }), { status: 500 });
  }
}