// src/api/regenerate-plan/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getVertexAIModel } from '@/lib/vertexai';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const dynamic = 'force-dynamic';

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

    
function analyzeUserPerformance(planTopics, userDeclaredHours) {
    let totalPlannedHours = 0;
    let totalCompletedSubTopics = 0;
    let totalPlannedSubTopics = 0;
    const today = new Date();

    planTopics.forEach(day => {
        const dayDate = new Date(day.date);
        dayDate.setHours(0, 0, 0, 0); // Normalize
        
        if (dayDate < today && day.sub_topics) {
            totalPlannedHours += day.study_hours || userDeclaredHours;
            totalPlannedSubTopics += day.sub_topics.length;
            totalCompletedSubTopics += day.sub_topics.filter(sub => sub.completed).length;
        }
    });

    if (totalPlannedSubTopics === 0) {
        // Not enough data to analyze, so we trust the user's declared hours.
        return {
            analysisSummary: "Not enough past performance data to analyze. Sticking to the user's declared pace.",
            realistic_hours_per_day: userDeclaredHours
        };
    }

    const completionRate = totalCompletedSubTopics / totalPlannedSubTopics;
    const daysAnalyzed = planTopics.filter(d => new Date(d.date) < today).length || 1;
    const avgPlannedHours = totalPlannedHours / daysAnalyzed;
    const realisticPace = avgPlannedHours * completionRate;
    // Clamp the value to a reasonable range (e.g., 1 to 8 hours)
    const realisticHours = Math.max(1, Math.min(Math.round(realisticPace), 8));

    const analysisSummary = `User declared a pace of ${userDeclaredHours} hours/day. Based on a completion rate of ${Math.round(completionRate * 100)}% over ${daysAnalyzed} past day(s), their actual sustainable pace is closer to ${realisticHours} hours/day.`;

    return { analysisSummary, realistic_hours_per_day: realisticHours };
}

  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { plan_id, user_feedback, user_declared_hours } = await request.json();
    if (!plan_id) return new Response(JSON.stringify({ error: 'Plan ID is required' }), { status: 400 });

    const { data: existingPlan, error: fetchError } = await supabase
      .from('study_plans')
      .select(`*, plan_topics(*, quiz_sessions(score, created_at))`)
      .eq('id', plan_id).eq('user_id', session.user.id).single();
    if (fetchError) throw new Error(`Failed to fetch plan: ${fetchError.message}`);

    const today = new Date();
    const startDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000 )).toISOString().split("T")[0];
    const examDateObj = new Date(existingPlan.exam_date);
    const daysLeft = Math.max(1, Math.ceil((examDateObj - today) / (1000 * 60 * 60 * 24)));

    const completedTopics = [];
    const incompletePastTopics = [];
    existingPlan.plan_topics.forEach(day => {
        const dayDate = new Date(day.date);
        if (dayDate < today && day.sub_topics) {
            day.sub_topics.forEach(sub => {
                if (sub.completed) {
                    completedTopics.push(sub.text);
                } else {
                    incompletePastTopics.push(sub.text);
                }
            });
        }
    });

    const performanceData = existingPlan.plan_topics
        .filter(topic => topic.quiz_sessions && topic.quiz_sessions.length > 0)
        .map(topic => {
            const recentScores = topic.quiz_sessions
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 3)
                .map(session => session.score);
            
            return `For topic "${topic.topic_name}", user's last 3 quiz scores were: ${recentScores.join(', ') || 'N/A'}.`;
        })
        .join('\n');

    const performanceAnalysis = analyzeUserPerformance(existingPlan.plan_topics, user_declared_hours || 4);
    
    const plannerModel = await getVertexAIModel('gemini-2.5-flash', { responseMimeType: "application/json" });

    // --- AGENT 1: THE TRIAGE AGENT (THE BRAIN) ---
    const triagePrompt = `
      You are a hyper-logical, data-driven AI academic coach. Your task is to analyze a complete dossier of a student's study plan and performance, then create a new, brutally honest strategic triage. Output ONLY a single, valid JSON object.

      **DOSSIER CONTENTS:**
      - **Original Plan's Strategy:** ${existingPlan.generation_context || 'None provided.'}
      - **Original Syllabus:** """${existingPlan.syllabus}"""
      - **Time Remaining:** ${daysLeft} days.
      - **User's Stated Pace:** User believes they can study ${user_declared_hours || 'an unspecified number of'} hours/day.
      - **PERFORMANCE ANALYSIS (GROUND TRUTH):** ${performanceAnalysis.analysisSummary}
      - **Quiz Performance Summary:** ${performanceData || 'No quiz data available.'}
      - **Study Debt (Topics to Reschedule):** ${incompletePastTopics.join(', ') || 'None'}
      - **User's New Feedback (Highest Priority):** "${user_feedback || 'No specific feedback.'}"

      **YOUR DIRECTIVE:**
      Synthesize ALL of the above data. Your new strategy MUST be grounded in the "Performance Analysis" reality, not the user's stated pace. You MUST set the "recommended_study_hours_per_day" to the provided realistic value.

      **CRITICAL JSON SCHEMA (Return ONLY this object):**
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

    const triageResult = await plannerModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: triagePrompt }] }]
    });
    const triageData = JSON.parse(triageResult.response.candidates[0].content.parts[0].text);

    // --- AGENT 2: THE COMMUNICATOR AGENT ---
    const communicatorPrompt = `
    - CONSTITUTION: ${KalPad_Constitution}

    - YOUR PERSONA: You are KalPad. Your persona is the super-smart, brutally honest senior from an Indian college (think IIT/DU). Your language is Hinglish-aware, witty, and direct. You are the 'yaar' who has all the notes and the perfect strategy to crack any exam. You are here to cut through the BS and give real, actionable advice.

    - YOUR MISSION: Your one and only job is to write the "overall_approach" narrative for a regenerated study plan. You will translate the cold, hard data below into a motivating, no-nonsense battle plan that speaks directly to an Indian student.

   **FINAL STRATEGIC DECISIONS**
        - Recommended Study Pace: ${triageData.recommended_study_hours_per_day} hours/day.
        - User's Previous Pace: ${user_declared_hours || 'N/A'} hours/day.
        - Estimated Syllabus Coverage: ${triageData.estimated_coverage}%.
        - Study Debt to Reschedule: ${incompletePastTopics.length} topics.
        - Emphasized Topics: ${JSON.stringify(triageData.emphasized_topics.map(t => t.topic))}
        - De-prioritized Topics: ${JSON.stringify(triageData.deprioritized_topics.map(t => t.topic))}
        - Skipped Topics: ${JSON.stringify(triageData.skipped_topics.map(t => t.topic))}
        - **User's New Feedback (Highest Priority):** "${user_feedback || 'No specific feedback.'}"

    **YOUR TASK & TONE (EXECUTE THIS PRECISELY):**

    1.  **Acknowledge and Address:** Start by directly acknowledging the user's feedback. Show you've listened. Example: "Alright, I saw your note about finding Quantum Tunneling tough. Let's be real, that topic is a beast. We've built this new plan around that."

    2.  **Be Brutally Honest (The Reality Check):** If there's a mismatch between their old pace and the recommended pace, call it out directly but constructively. Frame it as working smarter, not harder. Example: "Look, let's have a straight talk. The old pace wasn't cutting it. Trying to cram 8 hours a day is a recipe for burnout. The data shows you're most effective at around ${triageData.recommended_study_hours_per_day} solid hours. We're switching to a pace that's realistic and will actually get you results, instead of just making you tired."

    3.  **Explain the 'How' (The High-Level Game Plan):** Give a brief, high-level overview of the plan's structure in phases. This builds confidence. Example: "So here's the game plan. For the first week, we're going to focus purely on clearing your backlog and building a rock-solid foundation on the most important concepts. Forget everything else. Once your 'fundas' are clear, we'll pivot to intense problem-solving and mock tests in the second half. It's a two-stage attack."

    4.  **Frame the Strategy (The Smart Jugaad):** If the coverage is less than 100%, present this as a strategic masterstroke, not a compromise. This is about beating the exam, not just completing the syllabus. Example: "Now, you'll see we're aiming for ${triageData.estimated_coverage}% coverage. This isn't a compromise; it's a planned attack. We're strategically skipping the low-yield, 'pakaau' topics that take ages and barely show up on the exam. This is smart 'jugaad' – we're freeing up your mental energy to absolutely master the topics that will get you the highest marks. We're trading useless effort for a higher rank. It's a winning trade."

    5.  **Cultural Grounding (IMPORTANT):**
        -   **DO:** Use analogies and phrases an Indian student would instantly get (e.g., "clearing your fundas," "this isn't about ratta maar," "smart jugaad," "pakaau topics").
        -   **DO NOT:** Use Western corporate jargon ("synergize," "circle back") or American pop culture references. Keep it grounded in the Indian academic experience.

    **UNBREAKABLE RULES:**
    -   You are FORBIDDEN from listing the specific 'emphasized', 'deprioritized', or 'skipped' topics. That's for the detailed report. Your job is the narrative.
    -   Your ONLY output MUST be a single, valid JSON object with one key: { "overall_approach": "<Your personalized, Indianized, and strategic paragraph here>" }
    `;

        const communicatorResult = await plannerModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: communicatorPrompt }] }]
        });
        const strategy = {
            ...triageData,
            overall_approach: JSON.parse(communicatorResult.response.candidates[0].content.parts[0].text).overall_approach || "Here is your new strategic plan."
        };

        // --- AGENT 3: THE HIERARCHICAL PLANNER (Identical to V2 generate-plan) ---
        let comprehensiveWeeklyPlan = [];
        if (daysLeft > 90) {
           // ... (logic for monthly plan generation, identical to new-plan)
             const monthlyPlanPrompt = `
              ${KalPad_Constitution}
              **Your Task:** Act as a long-term academic architect. Your job is to create a high-level, month-by-month plan to provide structure for the entire study period. Do not plan daily tasks yet.
              
              **INPUT DATA:**
              - Overall Strategy: ${strategy.overall_approach}
              - Full Syllabus: """${existingPlan.syllabus}"""
              - Total Duration: ${daysLeft} days.

              **CRITICAL JSON SCHEMA:** Return a JSON array of objects. Each object represents a month and MUST have these keys:
              - "month": (number) The month number in the sequence (e.g., 1, 2, 3).
              - "main_focus_topics": (array of strings) The primary chapters or units to be covered this month.
              - "goals": (string) A concise, one-sentence goal for the month (e.g., "Master all foundational concepts and complete Unit 1 & 2.").
            `;

            const monthlyResult = await plannerModel.generateContent({
              contents: [{ role: 'user', parts: [{ text: monthlyPlanPrompt }] }]
          });
            const monthlyPlan = JSON.parse(monthlyResult.response.candidates[0].content.parts[0].text);
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

                const weeksResult = await plannerModel.generateContent({
                  contents: [{ role: 'user', parts: [{ text: weeksInMonthPrompt }] }]
                });
                const weeksForMonth = JSON.parse(weeksResult.response.candidates[0].content.parts[0].text);
                comprehensiveWeeklyPlan.push(...weeksForMonth);
            }
        } else {
            const weeklyPlanPrompt = `
              ${KalPad_Constitution}
              **Your Task:** Act as an academic strategist. Create a high-level, week-by-week plan for the entire study period.
              
              **INPUT DATA:**
              - Overall Strategy: ${strategy.overall_approach}
              - Full Syllabus: """${existingPlan.syllabus}"""
              - Total Duration: ${daysLeft} days.

              **CRITICAL JSON SCHEMA:** Return a JSON array of objects. Each object represents a week and MUST have these keys:
              - "week": (number) The week number (e.g., 1, 2, ...).
              - "main_focus_topics": (array of strings) The primary chapters or units to be covered this week.
              - "goals": (string) A concise, one-sentence goal for the week.
            `;

            const weeklyResult = await plannerModel.generateContent({
                contents: [{ role: 'user', parts: [{ text: weeklyPlanPrompt }] }]
            });
            comprehensiveWeeklyPlan = JSON.parse(weeklyResult.response.candidates[0].content.parts[0].text);
        }

        // --- AGENT 4: THE WEEKLY BATCH PLANNER & SIMPLIFIED STREAMING LOGIC ---
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
              try {
                // First, stream the new strategy object
                controller.enqueue(encoder.encode(JSON.stringify({ type: 'strategy', data: strategy }) + '\n---\n'));
                
                let plannedTopicsList = completedTopics;
                let dayCounter = 0;

                for (const weekData of comprehensiveWeeklyPlan) {
                    if (dayCounter >= daysLeft) break;

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
                    The Strategist has determined the optimal daily study time is **${strategy.recommended_study_hours_per_day} hours**. The user's maximum requested time is **${user_declared_hours} hours**. You must adhere to the following rules:
                    - Your primary goal is to create days that average around **${strategy.recommended_study_hours_per_day} hours**. You should try the hardest to keep everything within the limit.
                    - For 'Hard' or 'Intense' days, you have permission to increase the study time, but you are forbidden from exceeding the user's maximum of **${user_declared_hours} hours**.
                    - An 'Easy' day should not exceed 3 hours.
                    - An 'Intense' day must be used sparingly and must always be followed by an 'Easy' or 'Medium' day to ensure sustainability.
                    - **You are explicitly forbidden from creating a single day that totals more than the user's requested ${user_declared_hours} hours.**
                    
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
                            "study_hours": ${user_declared_hours},
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
                    
                    const weekResult = await plannerModel.generateContent({
                        contents: [{ role: 'user', parts: [{ text: weeklyBatchPrompt }] }]
                    });
                    const weekPlanObject = JSON.parse(weekResult.response.candidates[0].content.parts[0].text);
                    let weekPlanArray = weekPlanObject.weekly_plan || [];

                    const forbiddenTopicStrings = strategy.skipped_topics.map(t => t.topic.toLowerCase());
                    if (forbiddenTopicStrings.length > 0) {
                        weekPlanArray = weekPlanArray.map(dayPlan => {
                            dayPlan.sub_topics = dayPlan.sub_topics.filter(subTopic => 
                                !forbiddenTopicStrings.some(forbidden => subTopic.text.toLowerCase().includes(forbidden))
                            );
                            return dayPlan;
                        });
                    }

                    for (const dayPlan of weekPlanArray) {
                        if (dayCounter >= daysLeft) break;
                        dayCounter++;
                        const currentDate = new Date(startDate);
                        currentDate.setDate(currentDate.getDate() + dayCounter - 1);
                        dayPlan.date = currentDate.toISOString().split('T')[0];
                        dayPlan.day = dayCounter;
                        if (dayPlan.topic_name) plannedTopicsList.push(dayPlan.topic_name);
                        controller.enqueue(encoder.encode(JSON.stringify({ type: 'plan_topic', data: dayPlan }) + '\n---\n'));
                    }
                }
                
                // --- ARCHITECTURAL CHANGE: REMOVED 'end' EVENT ---
                // The stream is simply closed. The frontend will know it's done.
                controller.close();

              } catch (streamError) {
                  console.error("Error during plan generation stream:", streamError);
                  controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', data: { message: streamError.message } }) + '\n---\n'));
                  controller.close();
              }
            }
        });

        return new Response(stream, { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Full error in regenerate-plan API:', error);
    return new Response(JSON.stringify({ error: error.message || 'An internal error occurred.' }), { status: 500 });
  }
}