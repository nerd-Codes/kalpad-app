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

  // --- DEFINITIVE FIX: AUTHENTICATION MOVED OUTSIDE AND AHEAD OF THE STREAM ---
  const supabase = createRouteHandlerClient({ cookies });
  let session;
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
      const jwt = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(jwt);
      if (user) { session = { user }; }
  }
  if (!session) {
      const { data } = await supabase.auth.getSession();
      session = data.session;
  }

  if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const { examName, syllabus, examDate, useDocuments } = await request.json();

  // --- STREAMING WRAPPER START ---
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {

      const streamUpdate = (type, message) => {
          try {
              const payload = JSON.stringify({ type, data: { message } });
              controller.enqueue(encoder.encode(payload + '\n---\n'));
          } catch (e) {
              // This prevents a crash if we try to write to a controller that
              // the environment has already closed.
              console.warn(`Could not stream update ('${type}') to a closed controller.`);
          }
      };

      

      try {

        streamUpdate('status', 'Connection established. Initializing planner...');

        
        streamUpdate('status', 'Authenticated. Reading syllabus...');
        const today = new Date();
        const startDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000 )).toISOString().split("T")[0];
        const daysLeft = Math.max(1, Math.ceil((new Date(examDate) - today) / (1000 * 60 * 60 * 24)));
        
        let retrievedContext = "No documents were used for context.";
        if (useDocuments) {
            streamUpdate('status', 'Processing documents with semantic search...');
            const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
            const syllabusTopics = getTopicsFromSyllabus(syllabus);
            let allMatches = [];
            
            // --- DEFINITIVE FIX: Correctly get 'index' for the status update ---
            for (const [index, topic] of syllabusTopics.entries()) {
              streamUpdate('status', `Analyzing syllabus topic ${index + 1}/${syllabusTopics.length}: "${topic}"`);
              const result = await embeddingModel.embedContent(topic);
              const { data: matches, error } = await supabase.rpc('match_documents', {
                  query_embedding: result.embedding.values,
                  match_count: 2,
                  target_user_id: session.user.id
              });
              if (error) { console.error(`Error matching documents for topic "${topic}":`, error); continue; }
              if (matches && matches.length > 0) { allMatches.push(`For topic "${topic}", notes say: """${matches.map(m => m.content).join('\n---\n')}"""`); }
            }
            if (allMatches.length > 0) { 
              retrievedContext = allMatches.join('\n\n');
              streamUpdate('status', 'Document analysis complete. Building strategy...');
            } 
            else { 
              retrievedContext = "No relevant info found in documents for this syllabus."; 
              streamUpdate('status', 'No relevant documents found. Building general strategy...');
            }
        } else {
          streamUpdate('status', 'Building strategy...');
        }
        
        const plannerModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });

        // --- STAGE 1: THE STRATEGIST ---
        const strategyPrompt = `
          ${KalPad_Constitution}
          **Your Task:** You are the Master Strategist. Analyze the following high-level details and create a concise, motivating strategy report. This is the first thing the student will see.
          
          **INPUT DATA:**
          - Exam Name: "${examName}"
          - Total Days Remaining: ${daysLeft}
          - Full Syllabus: """${syllabus}"""
          - Context from User's Documents: """${retrievedContext}"""

          **CRITICAL JSON SCHEMA (Return ONLY a single, valid JSON object):**
          {
            "overall_approach": "A thoughtful, encouraging paragraph explaining your logic. You MUST include a quantitative estimate of syllabus coverage (e.g., 'This plan is designed to cover approximately 95% of the syllabus...').",
            "emphasized_topics": ["An array of the 3-5 most critical, high-ROI topics you've identified."],
            "skipped_topics": [{"topic": "Topic Name", "reason": "Reason for skipping (e.g., low weightage, high time cost)"}]
          }
          If coverage is 100%, "skipped_topics" MUST be an empty array [].
        `;
        const strategyResult = await plannerModel.generateContent(strategyPrompt);
        const strategy = JSON.parse(strategyResult.response.text());
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'strategy', data: strategy }) + '\n---\n'));

        // --- STAGE 2 & 3: THE HIERARCHICAL PLANNER ---
        let comprehensiveWeeklyPlan = [];
        if (daysLeft > 90) {
            const monthlyPlanPrompt = `
              ${KalPad_Constitution}
              **Your Task:** Act as a long-term academic architect. Your job is to create a high-level, month-by-month plan to provide structure for the entire study period. Do not plan daily tasks yet.
              
              **INPUT DATA:**
              - Overall Strategy: ${strategy.overall_approach}
              - Full Syllabus: """${syllabus}"""
              - Total Duration: ${daysLeft} days.

              **CRITICAL JSON SCHEMA:** Return a JSON array of objects. Each object represents a month and MUST have these keys:
              - "month": (number) The month number in the sequence (e.g., 1, 2, 3).
              - "main_focus_topics": (array of strings) The primary chapters or units to be covered this month.
              - "goals": (string) A concise, one-sentence goal for the month (e.g., "Master all foundational concepts and complete Unit 1 & 2.").
            `;
            const monthlyResult = await plannerModel.generateContent(monthlyPlanPrompt);
            const monthlyPlan = JSON.parse(monthlyResult.response.text());
            for (const [index, monthData] of monthlyPlan.entries()) {
                const globalWeekOffset = index * 4;
                const weeksInMonthPrompt = `
                  **Your Task:** Act as a weekly foreman. Your job is to take the plan for a single month and break it down into 4 granular weekly plans.
                  
                  **CONTEXT:**
                  - Month to Plan: ${monthData.month}
                  - This Month's Goals: "${monthData.goals}"
                  - This Month's Main Focus Topics: "${monthData.main_focus_topics.join(', ')}"

                  **CRITICAL JSON SCHEMA:** Return a JSON array of exactly 4 objects. Each object represents a week and MUST have these keys:
                  - "week": (number) The GLOBAL week number (e.g., for Month 2, this would be 5, 6, 7, 8). Use the offset ${globalWeekOffset}.
                  - "main_focus_topics": (array of strings) The specific sub-topics or sections to cover this week.
                  - "goals": (string) A one-sentence goal for this specific week.
                `;
                const weeksResult = await plannerModel.generateContent(weeksInMonthPrompt);
                const weeksForMonth = JSON.parse(weeksResult.response.text());
                comprehensiveWeeklyPlan.push(...weeksForMonth);
            }
        } else {
            const weeklyPlanPrompt = `
              ${KalPad_Constitution}
              **Your Task:** Act as an academic strategist. Create a high-level, week-by-week plan for the entire study period.
              
              **INPUT DATA:**
              - Overall Strategy: ${strategy.overall_approach}
              - Full Syllabus: """${syllabus}"""
              - Total Duration: ${daysLeft} days.

              **CRITICAL JSON SCHEMA:** Return a JSON array of objects. Each object represents a week and MUST have these keys:
              - "week": (number) The week number (e.g., 1, 2, ...).
              - "main_focus_topics": (array of strings) The primary chapters or units to be covered this week.
              - "goals": (string) A concise, one-sentence goal for the week.
            `;
            const weeklyResult = await plannerModel.generateContent(weeklyPlanPrompt);
            comprehensiveWeeklyPlan = JSON.parse(weeklyResult.response.text());
        }

        streamUpdate('status', 'High-level architecture complete. Generating daily tasks...');

        // --- STAGE 4: THE DAILY TUTOR ---
        let plannedTopicsList = [];
        let dayCounter = 0;
        for (const weekData of comprehensiveWeeklyPlan) {
            if (dayCounter >= daysLeft) break;
            const daysInThisWeek = Math.min(7, daysLeft - dayCounter);
            for (let i = 0; i < daysInThisWeek; i++) {
                dayCounter++;
                const currentDate = new Date(startDate);
                currentDate.setDate(currentDate.getDate() + dayCounter - 1);
                const formattedDate = currentDate.toISOString().split('T')[0];
                const iterativeDayPrompt = `
                  ${KalPad_Constitution}
                  **Your Task:** You are the Daily Tutor. Your job is to generate a detailed, actionable plan for Day ${dayCounter} ONLY, using all the context provided.
                  
                  **FULL CONTEXT:**
                  - Overall Strategy: "${strategy.overall_approach}"
                  - This Week's Goals (Week ${weekData.week}): "${weekData.goals}"
                  - This Week's Main Focus Topics: "${weekData.main_focus_topics.join(', ')}"
                  - Full Syllabus for Reference: """${syllabus}"""
                  - Topics Already Planned in Previous Days (IMPORTANT: Do NOT repeat these): "${plannedTopicsList.join(', ') || 'None yet.'}"

                  **CRITICAL INSTRUCTIONS:**
                  - Focus only on creating tasks for Day ${dayCounter}.
                  - The "sub_topics" are the most critical output. They must be small, concrete tasks a student can actually complete.
                  
                  **CRITICAL JSON SCHEMA (Return ONLY a single, valid JSON object for Day ${dayCounter}):**
                  {
                    "day": ${dayCounter},
                    "date": "${formattedDate}",
                    "topic_name": "A concise and descriptive name for this day's learning session",
                    "study_hours": 3,
                    "importance": 8,
                    "sub_topics": [
                      {"text": "Specific, actionable task 1 (e.g., 'Read pages 25-30 of the textbook on X').", "completed": false},
                      {"text": "Specific, actionable task 2 (e.g., 'Solve 3 practice problems on Y').", "completed": false},
                      {"text": "Specific, actionable task 3 (e.g., 'Watch the recommended video on Z').", "completed": false}
                    ]
                  }
                `;
                const dayResult = await plannerModel.generateContent(iterativeDayPrompt);
                const dayPlan = JSON.parse(dayResult.response.text());
                if (dayPlan.topic_name) { plannedTopicsList.push(dayPlan.topic_name); }
                controller.enqueue(encoder.encode(JSON.stringify({ type: 'plan_topic', data: dayPlan }) + '\n---\n'));
            }
        }
        
        controller.close();

      } catch (error) {
        console.error("Critical Error in generate-plan stream:", error);
        streamUpdate('error', error.message || 'An unknown error occurred.');
        controller.close();
      }
    }
  });

  return new Response(stream, { headers: { 'Content-Type': 'application/json' } });
}