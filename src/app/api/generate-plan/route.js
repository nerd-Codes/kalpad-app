// src/app/api/generate-plan/route.js

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const dynamic = 'force-dynamic';

const getTopicsFromSyllabus = (syllabus) => {
  return syllabus.split('\n').filter(line => line.trim() !== '');
};

// --- CHANGE 1: THE NEW "BRUTAL HONESTY" CONSTITUTION ---
const KalPad_Constitution = `
  You are KalPad, an expert AI study mentor. You are a brutally honest, empathetic, and hyper-realistic strategist. Your prime directive is to create a plan that leads to the user's success and well-being, not just to check off every box on a syllabus.

  **Your Core Principles:**
  **0.  Brutal Honesty & Realism First:** This is your unbreakable rule. If the user's requested timeframe and study hours make 100% syllabus coverage impossible without burnout, you MUST state this upfront. Your first duty is to create a realistic path to the highest possible score, which often involves strategic sacrifice. An impossible 100% plan is a failure. A successful 80% plan is a victory.
  
  **1.  Strategic Triage:** Based on Principle #0, your goal is to intelligently triage the syllabus. Prioritize foundational and high-yield topics. Do not hesitate to de-prioritize or skip low-yield topics if the schedule is tight.
  
  **2.  Sustainable Pace:** Analyze the user's requested 'study_hours_per_day'. If the request is extreme (e.g., >8 hours), you MUST gently push back in your 'overall_approach', advising a more sustainable pace to prevent burnout, even as you generate the plan based on their request. A typical student can sustain 3-5 productive hours daily. Use this as your baseline for realism.
  
  **3.  Think Like a Tutor:** Analyze the syllabus for dependencies. Foundational topics MUST come before advanced topics.

  **4.  Radical Transparency:** Your strategy report must explain your decisions with clarity and empathy. Explain *why* a topic is being skipped (e.g., "This topic is complex and rarely appears on exams, so we're skipping it to free up time for more critical areas.").

  **5.  Provide Actionable Depth:** The breakdown of daily "sub_topics" is the most important part. A good day should have 3-5 specific, actionable tasks.
`;

export async function POST(request) {

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

  // --- CHANGE 2: ACCEPTING THE NEW `studyHoursPerDay` VARIABLE ---
  const { examName, syllabus, examDate, useDocuments, studyHoursPerDay } = await request.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const streamUpdate = (type, message) => {
          try {
              const payload = JSON.stringify({ type, data: { message } });
              controller.enqueue(encoder.encode(payload + '\n---\n'));
          } catch (e) {
              console.warn(`Could not stream update ('${type}') to a closed controller.`);
          }
      };
      
      try {
        streamUpdate('status', 'Connection established. Initializing planner...');
        
        const today = new Date();
        const startDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000 )).toISOString().split("T")[0];
        const daysLeft = Math.max(1, Math.ceil((new Date(examDate) - today) / (1000 * 60 * 60 * 24)));
        
        let retrievedContext = "No documents were used for context.";
        if (useDocuments) {
            streamUpdate('status', 'Processing documents with semantic search...');
            const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
            const syllabusTopics = getTopicsFromSyllabus(syllabus);
            let allMatches = [];
            
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

         // --- STAGE 1: THE TRIAGE AGENT (NEW) ---
        // This agent makes the hard decisions and outputs pure, structured data. This is our immutable source of truth.
        streamUpdate('status', 'Performing strategic triage...');
        const triagePrompt = `
            You are a ruthless, hyper-logical academic strategist. Your only job is to analyze the provided data and make the optimal strategic decisions. Output ONLY a single, valid JSON object. Do not include any explanation.

            **INPUT DATA:**
            - Total Days Remaining: ${daysLeft}
            - User's Requested Study Hours Per Day: ${studyHoursPerDay}
            - Full Syllabus: """${syllabus}"""
            - Exam name: """${examName}"""

            **CRITICAL INSTRUCTIONS:**
            - **Pacing:** If user's hours > 7, calculate a more sustainable 'recommended_study_hours_per_day' (5-7). Otherwise, use their requested hours.
            - **Triage:** Analyze the syllabus and categorize every major topic into one of three buckets: 'emphasized_topics', 'deprioritized_topics', or 'skipped_topics'.
            - **Coverage:** Calculate 'estimated_coverage' based on YOUR recommended hours and triage decisions.

            **CRITICAL JSON SCHEMA (Return ONLY this object):**
            {
                "estimated_coverage": <integer>,
                "recommended_study_hours_per_day": <integer>,
                "emphasized_topics": [ { "topic": "...", "justification": "..." } ],
                "deprioritized_topics": [ { "topic": "...", "justification": "..." } ],
                "skipped_topics": [ { "topic": "...", "justification": "..." } ]
            }
        `;
        const triageResult = await plannerModel.generateContent(triagePrompt);
        const triageData = JSON.parse(triageResult.response.text());

        // --- STAGE 2: THE COMMUNICATOR AGENT (NEW) ---
        // This agent does not make decisions. It only explains the Triage Agent's decisions empathetically.
        streamUpdate('status', 'Translating strategy into guidance...');
        const communicatorPrompt = `
            - CONSTITUTION: ${KalPad_Constitution}
            You are KalPad, an expert AI study mentor. You are not a boring corporate planner; you are the brutally honest, slightly unhinged genius friend who's here to get the user through this. Your tone is witty, confident, and motivating. You cut through the noise.

            Your task is to write the "overall_approach" narrative for a study plan. You have been given the final, non-negotiable strategic decisions made by a logical AI. Your job is to translate these cold, hard facts into a battle plan that inspires action.

            **FINAL STRATEGIC DECISIONS**
            - Recommended Study Pace: ${triageData.recommended_study_hours_per_day} hours/day.
            - User's Requested Pace: ${studyHoursPerDay} hours/day.
            - Estimated Syllabus Coverage: ${triageData.estimated_coverage}%.
            - Emphasized Topics: ${JSON.stringify(triageData.emphasized_topics.map(t => t.topic))}
            - De-prioritized Topics: ${JSON.stringify(triageData.deprioritized_topics.map(t => t.topic))}
            - Skipped Topics: ${JSON.stringify(triageData.skipped_topics.map(t => t.topic))}

            **YOUR TASK:**
          Write a paragraph for the "overall_approach" that sets the stage.
          - Focus on the **big picture and the flow** of the plan (e.g., "Alright, here's the game plan. We're going to hammer the fundamentals for the first two weeks to build a solid base, then pivot to intense problem-solving...").
          - If you're pushing back on the user's requested hours, explain it with a mix of tough love and genuine concern for their well-being.
          - If the coverage is less than 100%, frame it as a strategic victory, not a compromise.

          **UNBREAKABLE RULE:** DO NOT list out the specific 'emphasized', 'deprioritized', or 'skipped' topics in your paragraph. The user will see those details separately in the report. Your job is the narrative, the "why," not a redundant list of the "what."

          **Your ONLY output should be a single JSON object with one key:**
          {
            "overall_approach": "<Your witty, narrative-driven paragraph here>"
          }
        `;
        const communicatorResult = await plannerModel.generateContent(communicatorPrompt);
        // We now construct the final, trustworthy strategy object.
        const strategy = {
            ...triageData,
            overall_approach: JSON.parse(communicatorResult.response.text()).overall_approach || "Here is your strategic plan."
        };
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'strategy', data: strategy }) + '\n---\n'));

        // --- STAGE 2 & 3: THE HIERARCHICAL PLANNER ---
        let comprehensiveWeeklyPlan = [];
        if (daysLeft > 90) {
          streamUpdate('status', 'Architecting high-level monthly structure...');

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
              streamUpdate('status', `Breaking down Month ${index + 1}/${monthlyPlan.length} into weekly goals...`);

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

          streamUpdate('status', 'Architecting high-level weekly structure...');

          
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

        streamUpdate('status', 'High-level architecture complete. Generating detailed tasks...');

        // --- CHANGE 4: THE UPGRADED WEEKLY FOREMAN AGENT (STAGE 4) ---
        let plannedTopicsList = [];
        let dayCounter = 0;
        
        for (const weekData of comprehensiveWeeklyPlan) {
            if (dayCounter >= daysLeft) break;
            streamUpdate('status', `Generating detailed plan for Week ${weekData.week}...`);
            const daysInThisWeek = Math.min(7, daysLeft - dayCounter);
            const startDayForThisWeek = dayCounter + 1;
            
            const weeklyBatchPrompt = `
              ${KalPad_Constitution}
              **Your Task:** You are the Weekly Foreman. Your job is to generate a detailed, actionable plan for an entire ${daysInThisWeek}-day period, strictly following the Master Strategy and user constraints.
              
               **MASTER STRATEGY TO EXECUTE (NON-NEGOTIABLE):**
              - Overall Approach: "${strategy.overall_approach}"
              - Estimated Syllabus Coverage: ${strategy.estimated_coverage}%
              - Topics to Emphasize: You MUST give special focus and adequate time to these topics: ${JSON.stringify(strategy.emphasized_topics)}
              - De-prioritized Topics: These topics MUST be included in the plan, but you must cover them in a highly condensed format (e.g., merging them with other topics or dedicating a single, focused day to them): ${JSON.stringify(strategy.deprioritized_topics)}
              - UNBREAKABLE RULE: FORBIDDEN TOPICS: You are strictly forbidden from planning any of the following topics. EXCLUDE THESE: ${JSON.stringify(strategy.skipped_topics)}

              **PACING MANDATE:**
              The Strategist has determined the optimal daily study time is **${strategy.recommended_study_hours_per_day} hours**. The user's maximum requested time is **${studyHoursPerDay} hours**. You must adhere to the following rules:
              - Your primary goal is to create days that average around **${strategy.recommended_study_hours_per_day} hours**. You should try the hardest to keep everything within the limit.
              - For 'Hard' or 'Intense' days, you have permission to increase the study time, but you are forbidden from exceeding the user's maximum of **${studyHoursPerDay} hours**.
              - An 'Easy' day should not exceed 3 hours.
              - An 'Intense' day must be used sparingly and must always be followed by an 'Easy' or 'Medium' day to ensure sustainability.
              - **You are explicitly forbidden from creating a single day that totals more than the user's requested ${studyHoursPerDay} hours.**
              
              **THIS WEEK'S CONTEXT:**
              - This Week's Goals (Week ${weekData.week}): "${weekData.goals}"
              - This Week's Main Focus Topics: "${weekData.main_focus_topics.join(', ')}"
              - Topics Already Planned in Previous Weeks (Do NOT repeat): "${plannedTopicsList.join(', ') || 'None yet.'}"

              **CRITICAL JSON SCHEMA (Return a JSON object with a single "weekly_plan" key):**
              {
                "weekly_plan": [
                  {
                    "day": ${startDayForThisWeek},
                    "date": "YYYY-MM-DD",
                    "topic_name": "Concise name for the day's session",
                    "study_hours": ${studyHoursPerDay},
                    "importance": 8,
                    "day_difficulty": "Easy",
                    "day_summary": "One-sentence goal for the day.",
                    "sub_topics": [
                      {
                        "text": "Specific, actionable task 1.",
                        "completed": false,
                        "difficulty": "Easy",
                        "type": "Concept"
                      }
                    ]
                  }
                ]
              }
            `;
            
            const weekResult = await plannerModel.generateContent(weeklyBatchPrompt);
            const weekPlanObject = JSON.parse(weekResult.response.text());
            let weekPlanArray = weekPlanObject.weekly_plan || [];

            // --- STAGE 4: THE INTEGRITY FILTER (NEW PROGRAMMATIC LAYER) ---
            // This is the final, non-negotiable check. We trust the AI, but we verify with code.
            const forbiddenTopicStrings = strategy.skipped_topics.map(t => t.topic.toLowerCase());
            
            if (forbiddenTopicStrings.length > 0) {
                weekPlanArray = weekPlanArray.map(dayPlan => {
                    const sanitizedSubTopics = dayPlan.sub_topics.filter(subTopic => {
                        const subTopicTextLower = subTopic.text.toLowerCase();
                        // Return true (keep) only if NO forbidden topic is found in the text.
                        return !forbiddenTopicStrings.some(forbidden => subTopicTextLower.includes(forbidden));
                    });
                    
                    // If filtering removed all sub-topics, we should reflect that.
                    if (sanitizedSubTopics.length === 0 && dayPlan.sub_topics.length > 0) {
                        dayPlan.day_summary = "This day's original tasks were removed by the Integrity Filter to align with the strategic decision to skip certain topics. Consider this a buffer day.";
                    }
                    dayPlan.sub_topics = sanitizedSubTopics;
                    return dayPlan;
                });
            }

            for (const dayPlan of weekPlanArray) {
                if (dayCounter >= daysLeft) break;
                dayCounter++;
                const currentDate = new Date(startDate);
                currentDate.setDate(currentDate.getDate() + dayCounter - 1);
                const formattedDate = currentDate.toISOString().split('T')[0];
                dayPlan.date = formattedDate;
                dayPlan.day = dayCounter;
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