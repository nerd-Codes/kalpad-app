// src/app/api/generate-plan/route.js

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getVertexAIModel, getVertexAIEmbeddingModel } from '@/lib/vertexai';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
            
            // --- DEFINITIVE FIX V4: Use the PredictionServiceClient for embeddings ---
           const syllabusTopics = getTopicsFromSyllabus(syllabus);
            let allMatches = [];
            const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

            for (const [index, topic] of syllabusTopics.entries()) {
              streamUpdate('status', `Analyzing syllabus topic ${index + 1}/${syllabusTopics.length}: "${topic}"`);
              
              // Use the original, working embedContent method
              const result = await embeddingModel.embedContent(topic);
              
              const { data: matches, error } = await supabase.rpc('match_documents', {
                  // Parse the response from the old SDK's structure
                  query_embedding: result.embedding.values,
                  match_count: 2,
                  target_user_id: session.user.id
              });

              if (error) { 
                console.error(`Error matching documents for topic "${topic}":`, error); 
                continue; 
              }
              
              if (matches && matches.length > 0) { 
                allMatches.push(`For topic "${topic}", notes say: """${matches.map(m => m.content).join('\n---\n')}"""`); 
              }
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
        
        // --- VERTEX AI MIGRATION: USE CENTRALIZED GENERATIVE MODEL ---
        const plannerModel = await getVertexAIModel('gemini-2.5-flash', { responseMimeType: "application/json" });

        streamUpdate('status', 'Performing strategic triage...');

        const triagePrompt = `
        You are a ruthless, hyper-logical academic strategist. Your only job is to analyze the provided data and make the optimal strategic decisions. You do not write prose or explanations; you output ONLY a single, valid JSON object containing your final, data-driven conclusions.

        **INPUT DATA:**
        - Exam Name: "${examName}"
        - Total Days Remaining: ${daysLeft}
        - User's Requested Study Hours Per Day: ${studyHoursPerDay}
        - Full Syllabus: """${syllabus}"""
        
        **UNBREAKABLE ANALYSIS DIRECTIVE:**
        Your analysis is a two-part process: Contextual Thinking and Literal Reporting.

        1.  **Contextual Thinking (Think Globally):** You MUST use your deep, internal knowledge of the broader subject (e.g., 'Electromagnetics', 'Quantum Physics') to understand the *context*, *importance*, and *interdependencies* of the topics listed in the user's provided "Full Syllabus". This global knowledge is essential and MUST inform the quality, structure, and strategic decisions of your entire plan.

        2.  **Literal Reporting (Report Locally):** While your thinking is global, your reporting must be local. The final **'estimated_coverage' percentage** that you output MUST be a direct and literal measure of how much of the user-provided "Full Syllabus" text will be covered by the plan. **Do not** calculate coverage against the entire subject in your knowledge base; calculate it ONLY against the specific text the user has given you. This is a non-negotiable reporting requirement.
                **CRITICAL JSON SCHEMA (Return ONLY this object and nothing else):**
        {
          "estimated_coverage": <A brutally honest integer based on your calculation in Step 3>,
          "recommended_study_hours_per_day": <A realistic integer based on your decision in Step 2>,
          "emphasized_topics": [
            {
              "topic": "Topic Name",
              "justification": "A concise, strategic reason why this topic is critical (e.g., 'Forms the foundational prerequisite for 50% of the syllabus.')."
            }
          ],
          "deprioritized_topics": [
            {
              "topic": "Topic Name",
              "justification": "The reason for its lower priority (e.g., 'Necessary prerequisite, will be covered in a highly condensed format to save time.')."
            }
          ],
          "skipped_topics": [
            {
              "topic": "Topic Name",
              "justification": "The specific reason for skipping this topic (e.g., 'Highly specialized and a disproportionate time investment for its likely exam weightage.')."
            }
          ]
        }
        `;
        // --- VERTEX AI MIGRATION: UPDATE GENERATE CONTENT CALL SYNTAX ---
        const triageResult = await plannerModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: triagePrompt }] }]
        });
        
        // --- VERTEX AI MIGRATION: UPDATE RESPONSE PARSING SYNTAX ---
        const triageResponseText = triageResult.response.candidates[0].content.parts[0].text;
        const triageData = JSON.parse(triageResponseText);

        streamUpdate('status', 'Translating strategy into guidance...');
        const communicatorPrompt = `
            - CONSTITUTION: ${KalPad_Constitution}
            - YOUR PERSONA: You are KalPad. Your persona is the super-smart, brutally honest senior from an Indian college (think IIT/DU). Your language is Hinglish-aware, witty, and direct. You are the 'yaar' who has all the notes and the perfect strategy to crack any exam. You are here to cut through the BS and give real, actionable advice.

            - YOUR MISSION: Your one and only job is to write the "overall_approach" narrative for a brand new study plan. You will translate the cold, hard data below into a motivating, no-nonsense battle plan that speaks directly to an Indian student.

            **FINAL STRATEGIC DECISIONS (THE GROUND TRUTH):**
            - Recommended Study Pace: ${triageData.recommended_study_hours_per_day} hours/day.
            - User's Requested Pace: ${studyHoursPerDay} hours/day.
            - Estimated Syllabus Coverage: ${triageData.estimated_coverage}%.
            - Emphasized Topics: ${JSON.stringify(triageData.emphasized_topics.map(t => t.topic))}
            - De-prioritized Topics: ${JSON.stringify(triageData.deprioritized_topics.map(t => t.topic))}
            - Skipped Topics: ${JSON.stringify(triageData.skipped_topics.map(t => t.topic))}

           
            **YOUR TASK & TONE (EXECUTE THIS PRECISELY):**

            1.  **The Welcome Reality Check:** Start with a confident, welcoming tone. Then, immediately address the user's requested study hours. If they're being unrealistic, gently but firmly call it out. Frame it as working smarter, not harder. Example: "Alright, let's do this. First things first, you've put down ${studyHoursPerDay} hours a day. That's ambitious, boss, but let's be real - consistency beats intensity. This plan is built around a more realistic ${triageData.recommended_study_hours_per_day} hours of deep, focused work. It's about winning the marathon, not burning out in the first sprint."

            2.  **The High-Level Game Plan:** Outline the structure of the plan in broad strokes. Give them a sense of the journey ahead. Example: "Here's how we're going to tackle this. The first half of our plan is all about 'Operation: Clear Fundas.' We will build a rock-solid base by mastering the core concepts, one by one. After that, we switch gears to full-on exam mode – think intense problem-solving, previous year papers, and revision cycles. It’s a proper two-phase surgical strike."

            3.  **The 'Topper' Strategy (Smart Jugaad):** If coverage is less than 100%, frame it as a top-tier strategic decision. This is the difference between a 'ghissu' (hard worker) and a 'topper' (smart worker). Example: "You'll notice we're aiming for ${triageData.estimated_coverage}% coverage. Don't panic, this is the 'topper' move. We are deliberately ignoring the few useless, 'pakaau' topics that have a terrible return on investment. Why waste a week on something that has a 2% chance of showing up for 1 mark? Instead, we're going to use that time to become absolute gods at the topics that make up 90% of the paper. This isn't about finishing the syllabus; it's about maximizing your final score. It's the ultimate 'jugaad'."

            4.  **Cultural Grounding (IMPORTANT):**
                -   **DO:** Use analogies and phrases an Indian student would instantly get (e.g., "clearing your fundas," "this isn't about ratta maar," "smart jugaad," "pakaau topics," "ghissu vs. topper").
                -   **DO NOT:** Use Western corporate jargon ("synergize," "circle back") or American pop culture references. Keep it grounded in the Indian academic experience.

            **UNBREAKABLE RULES:**
            -   You are FORBIDDEN from listing the specific 'emphasized', 'deprioritized', or 'skipped' topics. That's for the detailed report. Your job is the narrative.
            -   Your ONLY output MUST be a single, valid JSON object with one key: { "overall_approach": "<Your personalized, Indianized, and strategic paragraph here>" }
            `;
            
            
        // --- VERTEX AI MIGRATION: UPDATE GENERATE CONTENT CALL SYNTAX ---
        const communicatorResult = await plannerModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: communicatorPrompt }] }]
        });
        
        // --- VERTEX AI MIGRATION: UPDATE RESPONSE PARSING SYNTAX ---
        const communicatorResponseText = communicatorResult.response.candidates[0].content.parts[0].text;
        const strategy = {
            ...triageData,
            overall_approach: JSON.parse(communicatorResponseText).overall_approach || "Here is your strategic plan."
        };
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'strategy', data: strategy }) + '\n---\n'));

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
            const monthlyResult = await plannerModel.generateContent({ contents: [{ role: 'user', parts: [{ text: monthlyPlanPrompt }] }] });
            const monthlyPlan = JSON.parse(monthlyResult.response.candidates[0].content.parts[0].text);
            
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
                const weeksResult = await plannerModel.generateContent({ contents: [{ role: 'user', parts: [{ text: weeksInMonthPrompt }] }] });
                const weeksForMonth = JSON.parse(weeksResult.response.candidates[0].content.parts[0].text);
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
            const weeklyResult = await plannerModel.generateContent({ contents: [{ role: 'user', parts: [{ text: weeklyPlanPrompt }] }] });
            comprehensiveWeeklyPlan = JSON.parse(weeklyResult.response.candidates[0].content.parts[0].text);
        }

        streamUpdate('status', 'High-level architecture complete. Generating detailed tasks...');

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
            
            
            const weekResult = await plannerModel.generateContent({ contents: [{ role: 'user', parts: [{ text: weeklyBatchPrompt }] }] });
            const weekPlanObject = JSON.parse(weekResult.response.candidates[0].content.parts[0].text);
            let weekPlanArray = weekPlanObject.weekly_plan || [];

            // The Integrity Filter logic remains unchanged.
            const forbiddenTopicStrings = strategy.skipped_topics.map(t => t.topic.toLowerCase());
            if (forbiddenTopicStrings.length > 0) {
                weekPlanArray = weekPlanArray.map(dayPlan => {
                    const sanitizedSubTopics = dayPlan.sub_topics.filter(subTopic => {
                        const subTopicTextLower = subTopic.text.toLowerCase();
                        return !forbiddenTopicStrings.some(forbidden => subTopicTextLower.includes(forbidden));
                    });
                    
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