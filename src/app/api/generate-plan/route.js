// src/app/api/generate-plan/route.js

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const dynamic = 'force-dynamic';

const getTopicsFromSyllabus = (syllabus) => {
  return syllabus.split('\n').filter(line => line.trim() !== '');
};

const KalPad_Constitution = `
  You are KalPad, an expert AI study mentor. Your mission is to create the most effective, realistic, and motivating study plan possible. You are a strategist, not just a scheduler.

  **Your Core Principles:**
  1.  **Maximize Coverage:** Your primary goal is to cover 100% of the syllabus if realistically possible. Do NOT skip topics unless the time constraint is extreme (e.g., less than 20 days for a full semester syllabus).
  2.  **Be Realistic:** Assume a sustainable pace of 3-5 productive study hours per day.
  3.  **Think Like a Tutor:** Analyze the syllabus for dependencies. Foundational topics MUST come before advanced topics.
  4.  **Be Transparent:** Your strategy report must clearly explain your decisions.
  5.  **Provide Depth:** The breakdown of daily "sub_topics" is the most important part. A good day should have 3-5 specific, actionable tasks (e.g., "Understand principle X," "Solve 5 problems on Y," "Review concept Z"). Do not be lazy.
`;

export async function POST(request) {
  try {
    // Step 1: Authorize and get request body
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { examName, syllabus, examDate, useDocuments } = await request.json();
    const today = new Date();
    const startDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000 ))
                        .toISOString()
                        .split("T")[0];
    const daysLeft = Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24));
    
    // --- THIS IS THE FIX: Initialize retrievedContext before using it ---
    let retrievedContext = "No documents were used for context.";

    // Step 2: Semantic Search (Context Retrieval)
    if (useDocuments) {
      console.log("User opted to use documents. Starting semantic search...");
      const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
      const syllabusTopics = getTopicsFromSyllabus(syllabus);
      let allMatches = [];

      for (const topic of syllabusTopics) {
        const result = await embeddingModel.embedContent(topic);
        const embedding = result.embedding.values;
        const { data: matches, error } = await supabase.rpc('match_documents', {
          query_embedding: embedding,
          match_threshold: 0.75,
          match_count: 2,
        });
        
        if (error) {
          console.error(`Error matching documents for topic "${topic}":`, error);
          continue;
        }
        if (matches && matches.length > 0) {
          allMatches.push(`For the topic "${topic}", the user's material says:\n"""\n${matches.map(m => m.content).join('\n---\n')}\n"""`);
        }
      }
      
      if (allMatches.length > 0) {
        retrievedContext = allMatches.join('\n\n');
      } else {
        retrievedContext = "Could not find any relevant information in the uploaded documents for the given syllabus.";
      }
    }

    // Step 3: First AI Call - Generate the Strategy
    console.log("Generating strategy...");
    const strategyPrompt = `
      ${KalPad_Constitution}

      **Your Task:**
      Analyze the following details and create a high-level strategy report in a strict JSON format.

      - Exam: ${examName}, Days Remaining: ${daysLeft}, Syllabus: ${syllabus}
      - Context from User's Documents: ${retrievedContext}

      **CRITICAL JSON SCHEMA:**
      Your output must be a single JSON object.
      - "overall_approach": A thoughtful paragraph explaining your logic. You MUST include a quantitative estimate of syllabus coverage (e.g., "This plan is designed to cover approximately 95% of the syllabus...").
      - "emphasized_topics": An array of the 3-5 most critical topics.
      - "skipped_topics": An array of objects ONLY if you were forced to skip topics. If coverage is 100%, this MUST be an empty array.
    `;
    
    const strategyModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
    const strategyResult = await strategyModel.generateContent(strategyPrompt);
    const strategy = JSON.parse(strategyResult.response.text());
    console.log("Strategy generated successfully.");

    // Step 4: Second AI Call - Generate the Plan using the Strategy
    console.log("Generating detailed plan...");
    const planPrompt = `
  ${KalPad_Constitution}

  **Your Task:**
  Execute the provided strategy and create a detailed, day-by-day plan in a strict JSON array format. Your primary goal is to provide thoughtful, actionable sub-topics.

  **Strategy to Execute:**
  - Overall Approach: ${strategy.overall_approach}
  - Topics to Emphasize: ${strategy.emphasized_topics.join(', ')}
  - Topics to Skip: ${strategy.skipped_topics.map(t => t.topic).join(', ') || 'None'}

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
    const plan = JSON.parse(planResult.response.text());
    console.log("Plan generated successfully.");

    // Step 5: Combine the results and send to the frontend
    return new Response(JSON.stringify({ plan, strategy, context: retrievedContext }), { status: 200 });

  } catch (error) {
    console.error("Critical Error in generate-plan API:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}