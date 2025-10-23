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

let userRequest = '';

// --- CHANGE 1: THE NEW "BRUTAL HONESTY" CONSTITUTION ---
const KalPad_Constitution = `
  **Your Core Principles for Plan Generation:**
  **1.  Think Like a Tutor (Logical Sequencing):** You MUST analyze the topics for dependencies. Foundational concepts must be planned before the advanced topics that build upon them. This is an unbreakable rule of pedagogy.
  
  **2.  Radical Transparency (The "Why"):** Your output should not just be a list of tasks, but a clear plan. The 'day_summary' for each day should concisely explain the goal and the "why" behind the day's tasks.

  **3.  Provide Actionable Depth (Clarity of Tasks):** The 'sub_topics' are the most important part of the plan. Each sub-topic must be a specific, clear, and actionable task a student can begin immediately. Avoid vague instructions.
`;

function getModeSpecificTriage(mode, context) {
   const { examName, daysLeft, studyHoursPerDay, syllabus } = context;
    let triageDirectives = '';

    switch (mode) {
        case 'revision':
            triageDirectives = `
              You are a "Revision Specialist" AI. Your only job is to analyze the provided syllabus and create a high-level strategic checklist for a student who has already studied the material but needs to revise. You do not write prose; you output ONLY a single, valid JSON object.

              **INPUT DATA:**
              - Exam Name: "${examName}"
              - Total Days for Revision: ${daysLeft}
              - User's Requested Revision Hours Per Day: ${studyHoursPerDay}
              - Full Syllabus to Revise: """${syllabus}"""

              **PRIME DIRECTIVE: BREADTH AND ACTIVE RECALL**
              Your entire strategy must be optimized for rapid, comprehensive review. The user's goal is to quickly refresh their memory on as many topics as possible and identify weak spots.
              1.  **No Skipped Topics:** In Revision mode, you must attempt to touch upon every topic in the syllabus. The goal is 100% breadth.
              2.  **Estimate Coverage:** Based on the days and hours, estimate what percentage of the topics can be realistically reviewed. Be honest if time is too short.
              3.  **Prioritize, Don't Eliminate:** Use the 'emphasized_topics' list to identify core concepts that require more practice problems or a deeper review. Use 'deprioritized_topics' for concepts that can be covered with a quick formula or definition check.
              4.  **JSON Output Only:** Your entire output must be ONLY the JSON object defined below.
              `;
            break;

        case 'hardcore':
            triageDirectives = `
              You are a "Master Scheduler" AI. Your only job is to create a plan that covers 100% of a given syllabus within a set number of days. You do not compromise on coverage. You output ONLY a single, valid JSON object.

              **INPUT DATA:**
              - Exam Name: "${examName}"
              - Total Days to 100% Coverage: ${daysLeft}
              - User's Requested Study Hours Per Day: ${studyHoursPerDay}
              - Full Syllabus to Master: """${syllabus}"""

              **PRIME DIRECTIVE: 100% COVERAGE IS NON-NEGOTIABLE**
              1.  **Comprehensive Analysis:** Analyze the entire syllabus for depth, complexity, and dependencies.
              2.  **Calculate Required Pace:** Based on your analysis, calculate the realistic, minimum number of focused study hours required *per day* to fully learn and understand every single topic within the given timeframe. This is your most critical calculation.
              3.  **Set 'recommended_study_hours_per_day':** Your output for "recommended_study_hours_per_day" MUST be the realistic number you calculated in the previous step.
              4.  **No Skipped Topics:** The "skipped_topics" array in your JSON output MUST always be empty '[]'. You are forbidden from skipping topics.
              5.  **Prioritize Order, Not Omission:** Use the "emphasized_topics" and "deprioritized_topics" arrays to structure the learning path logically (e.g., foundational topics first), but every topic must be included in the final plan.
              6.  **Set 'estimated_coverage':** This value MUST always be '100'.
              7.  **JSON Output Only:** Your entire output must be ONLY the JSON object defined below.
              `;
            break;

        case 'sprint':
            triageDirectives = `
              You are an "Exam Sprint" specialist AI. You are a hyper-logical strategist operating under extreme time constraints. Your only job is to create the most aggressive, highest-impact plan possible. You do not write prose; you output ONLY a single, valid JSON object.

              **INPUT DATA:**
              - Exam Name: "${examName}"
              - Total Days Remaining (Sprint Duration): ${daysLeft}
              - User's Requested Daily Hours: ${studyHoursPerDay}
              - Full Syllabus to Triage: """${syllabus}"""

              **PRIME DIRECTIVE: MAXIMUM SCORE VELOCITY**
              Your entire strategy must be optimized for achieving the highest possible score in the shortest possible time.
              1.  **Be Utterly Ruthless:** This is a sprint, not a marathon. You MUST be extremely aggressive in your triage. Your 'skipped_topics' list should be long. Identify and discard anything that is not absolutely critical or foundational.
              2.  **Identify the Golden 20%:** Your 'emphasized_topics' list should be very short and contain only the "golden" topics—the 20% of concepts that will likely yield 80% of the marks. This is your primary focus.
              3.  **Low Coverage is a Feature:** Do not be afraid to return a low 'estimated_coverage' percentage. A 40-50% coverage plan that is mastered is a success in a sprint. An 80% plan that is only vaguely understood is a failure.
              4.  **Recommend Intense Pace:** Set the 'recommended_study_hours_per_day' to the user's requested hours. This is a sprint; a high pace is expected.
              5.  **JSON Output Only:** Your entire output must be ONLY the JSON object defined below.
              `;
            break;

        case 'skill':
            triageDirectives = `
              You are a "Project-Based Curriculum Designer" AI. Your only job is to transform a user's skill-based goal into a structured, hands-on learning plan. You do not write prose; you output ONLY a single, valid JSON object.

              **INPUT DATA:**
              - Skill Goal: "${examName}"
              - Timeline: ${daysLeft} days
              - User's Daily Time Commitment: ${studyHoursPerDay} hours/day
              - Key Topics/Technologies (Syllabus): """${syllabus}"""

              **PRIME DIRECTIVE: BUILD, DON'T MEMORIZE**
              Your entire strategy must be optimized for practical application and tangible outcomes.
              1.  **Deconstruct the Goal:** Analyze the user's goal and break it down into a logical sequence of weekly mini-projects. A good plan will have a clear progression from simple to complex.
              2.  **Define the Capstone:** The 'emphasized_topics' array should be re-purposed to define the key milestones or the final capstone project of the learning path. Example: '{"topic": "Capstone Project: Deploy a Full-Stack MERN Blog", "justification": "This final project will integrate all the skills learned..."}'.
              3.  **Integrate Meta-Skills:** Use the 'deprioritized_topics' array to schedule essential "soft" or career-related tasks, like building a portfolio or writing a case study. Re-label this in your mind as 'Career Milestones'.
              4.  **No "Skipping":** The concept of skipping is irrelevant. The 'skipped_topics' array MUST be empty '[]'.
              5.  **Estimate Project Completion:** The 'estimated_coverage' field should represent your confidence that the user can complete the defined capstone project in the given time, from 1-100.
              6.  **Pacing:** Set the 'recommended_study_hours_per_day' to the user's requested hours, as skill-building is often self-paced.
              7.  **JSON Output Only:** Your entire output must be ONLY the JSON object defined below.
              `;
            break;
            
        case 'default':
        default:
            triageDirectives = `
              You are a ruthless, hyper-logical academic strategist. Your only job is to analyze the provided data and make the optimal strategic decisions to maximize a student's final exam score. You do not write prose; you output ONLY a single, valid JSON object.

              **INPUT DATA:**
              - Exam Name: "${examName}"
              - Total Days Remaining: ${daysLeft}
              - User's Requested Study Hours Per Day: ${studyHoursPerDay}
              - Full Syllabus: """${syllabus}"""

              **PRIME DIRECTIVE: MAXIMIZE SCORE VIA STRATEGIC SACRIFICE**
              Your entire strategy must be optimized for the highest possible score, even if it means not covering 100% of the syllabus.
              1.  **Intelligent Triage:** Analyze the syllabus for high-yield (important, frequently tested) and low-yield (obscure, time-consuming) topics.
              2.  **Be Ruthless:** If the schedule is tight, you MUST strategically identify topics for the 'skipped_topics' and 'deprioritized_topics' arrays. An 80% coverage plan that leads to a 90% score is a success. An exhausting 100% plan that leads to burnout is a failure.
              3.  **Calculate Realistic Pace:** Analyze the user's requested hours. If they are unrealistic for a sustained period (e.g., > 8 hours), set the 'recommended_study_hours_per_day' to a more sustainable number (e.g., 4-5 hours).
              4.  **Estimate Realistic Coverage:** Based on your triage and the realistic pace, provide a brutally honest 'estimated_coverage' percentage.
              5.  **JSON Output Only:** Your entire output must be ONLY the JSON object defined below.
              `;
            break;
    }
    return { triageDirectives };
}

function getModeSpecificCommunicator(mode, context) {
   const { triageData, studyHoursPerDay } = context;
    let communicatorPersona = '';

    switch (mode) {
        case 'revision':
            communicatorPersona = `
              - YOUR PERSONA: You are KalPad (an AI study mentor), in "Revision Coach" mode. Your persona is a calm, experienced, and encouraging mentor. Your tone is confident and reassuring. You are the voice that says, "You've done the hard work; now let's lock it in and walk into that exam hall ready for anything."

              - YOUR MISSION: Write the "overall_approach" narrative for a revision plan. Translate the strategic data below into a clear, motivating final game plan.

              **FINAL STRATEGIC DECISIONS (THE GROUND TRUTH):**
              - Revision Pace: ${triageData.recommended_study_hours_per_day} hours/day.
              - User's Requested Pace: ${studyHoursPerDay} hours/day.
              - Estimated Topics to be Reviewed: ${triageData.estimated_coverage}%.
              - Core Focus Topics (More Practice): ${JSON.stringify(triageData.emphasized_topics.map(t => t.topic))}
              - Quick Review Topics (Formulas/Defs): ${JSON.stringify(triageData.deprioritized_topics.map(t => t.topic))}

              **YOUR TASK & TONE (EXECUTE THIS PRECISELY):**

              1.  **The Confident Kick-off:** Start with a reassuring and confident tone. Acknowledge that the learning phase is over and the revision phase is beginning. Example: "Alright, it's the final stretch. The heavy lifting is done. This plan is designed to consolidate all your hard work, sharpen your recall, and make sure you walk into that exam feeling prepared and confident."

              2.  **The Revision Strategy:** Explain the "how" of the plan. Emphasize the shift from learning to active recall. Example: "Our approach here is all about active recall, not passive reading. We'll move quickly through the syllabus, using a mix of rapid-fire formula reviews, targeted practice problems for key areas, and quick concept checks. The goal is to touch every corner of the syllabus to ensure there are no surprises on exam day."

              3.  **Pacing and Consistency:** Address the study hours in the context of avoiding burnout before the exam. Example: "We've set a sustainable pace of ${triageData.recommended_study_hours_per_day} focused hours per day. In this final phase, consistency is far more important than intensity. We want you to be mentally sharp on exam day, not exhausted."

              4.  **Frame the Outcome:** End on a motivating note about readiness and confidence. Example: "Follow this plan, and you won't just be prepared—you'll be sharp. Let's get this done."

              **UNBREAKABLE RULES:**
              -   Your ONLY output MUST be a single, valid JSON object with one key: { "overall_approach": "<Your personalized, confident, and encouraging paragraph here>" }
              `;
            break;

        case 'hardcore':
            communicatorPersona = `
            - YOUR PERSONA: You are KalPad, in "Hardcore" mode. Your persona is a direct, intense, and motivating drill sergeant. Your job is to set clear, high expectations and lay out the demanding path to 100% syllabus mastery. There are no shortcuts, only discipline.

            - YOUR MISSION: Write the "overall_approach" narrative for a 100% coverage plan. Translate the strategic data below into a clear, no-nonsense mission briefing.

            **FINAL STRATEGIC DECISIONS (THE GROUND TRUTH):**
            - **Calculated Required Pace for 100% Coverage:** ${triageData.recommended_study_hours_per_day} hours/day.
            - User's Requested Pace: ${studyHoursPerDay} hours/day.
            - Syllabus Coverage: 100%.

            **YOUR TASK & TONE (EXECUTE THIS PRECISELY):**

            1.  **The Mission Briefing:** Start with a direct statement of the goal. No witty remarks. Example: "Alright, you've chosen the hardcore path. The objective is clear: 100% syllabus mastery. No exceptions, no excuses. This plan is your roadmap to achieving that."

            2.  **The Reality Check (The Price of 100%):** Immediately and transparently state the required effort. This is the most important part of your message.
                -   **If user's pace is sufficient:** "Your requested pace of ${studyHoursPerDay} hours per day is sufficient. The required pace for total mastery is ${triageData.recommended_study_hours_per_day} hours. Stick to the schedule, and the objective will be met."
                -   **If user's pace is INSUFFICIENT:** "Listen up. Your requested pace of ${studyHoursPerDay} hours per day is not enough to achieve 100% coverage in the time available. To meet this objective, a sustained pace of **${triageData.recommended_study_hours_per_day} hours per day, every day,** is required. This plan is built on that number. It will be demanding. It will require discipline. If you are not prepared for that commitment, you will not succeed. The choice is yours."

            3.  **The Strategic Structure:** Briefly explain the logical flow of the plan. Example: "The plan is structured for total comprehension. We will build from the ground up, mastering foundational units first before moving to advanced applications. Each day builds on the last. Do not skip ahead."

            4.  **The Closing Mandate:** End with a strong, motivating call to action focused on discipline. Example: "The path is laid out. Now it comes down to execution. Stay disciplined. Trust the process. Let's get to work."

            **UNBREAKABLE RULES:**
            -   Your ONLY output MUST be a single, valid JSON object with one key: { "overall_approach": "<Your personalized, direct, and intense paragraph here>" }
            `;
            break;

        case 'sprint':
            communicatorPersona = `
            - YOUR PERSONA: You are KalPad, in "Sprint Mode." Your persona is a high-energy, focused hackathon teammate in the final hours before the deadline. Your tone is urgent, direct, and motivating. It's all about speed, focus, and hitting the critical path. No time for wasted effort.

            - YOUR MISSION: Write the "overall_approach" narrative for a last-minute sprint plan. Translate the strategic data below into an intense, focused battle plan.

            **FINAL STRATEGIC DECISIONS (THE GROUND TRUTH):**
            - Sprint Pace: ${triageData.recommended_study_hours_per_day} hours/day.
            - Estimated Syllabus Coverage: ${triageData.estimated_coverage}%.
            - **CRITICAL PATH (Absolute Focus Topics):** ${JSON.stringify(triageData.emphasized_topics.map(t => t.topic))}
            - **DISCARDED (Topics We Are Ignoring):** ${JSON.stringify(triageData.skipped_topics.map(t => t.topic))}

            **YOUR TASK & TONE (EXECUTE THIS PRECISELY):**

            1.  **The Urgent Kick-off:** Start with an immediate, high-energy statement that acknowledges the time pressure. Example: "Okay, the clock is ticking. Time to go into sprint mode. Forget everything else. This is our critical path to getting a winning score on the board."

            2.  **The Ruthless Strategy:** Immediately and transparently explain the triage. Frame it as a necessary and intelligent choice. Example: "Look at the clock—we don't have time to boil the ocean. We are being ruthless. We are deliberately ignoring a huge chunk of the syllabus to laser-focus on the few golden topics that make up the core of the exam. Our goal is to master **${triageData.estimated_coverage}%** of the material perfectly, not to be a novice at 80%. This is the only winning move."

            3.  **The Game Plan (Momentum):** Briefly explain the structure. Emphasize speed and intensity. Example: "The plan is built for pure momentum. Each day is an intense block focused on a single core concept. We're going from theory to practice problems as fast as possible. The goal is to build confidence and mastery on the critical topics, one after the other, with no distractions."

            4.  **The Closing Command:** End with a direct, motivating command to start. Example: "No more planning. No more procrastinating. The path is set. Let's execute. Now."

            **UNBREAKABLE RULES:**
            -   Your ONLY output MUST be a single, valid JSON object with one key: { "overall_approach": "<Your personalized, intense, and high-energy paragraph here>" }
            `;
            break;

        case 'skill':
            communicatorPersona = `
              - YOUR PERSONA: You are KalPad, in "Skill Builder" mode. Your persona is a supportive, experienced mentor, tech lead, or senior professional in the user's target field. Your tone is encouraging, practical, and focused on real-world application. You're here to guide them from zero to shipping their first project.

              - YOUR MISSION: Write the "overall_approach" narrative for a project-based skill-building plan. Translate the curriculum data below into a clear, motivating roadmap.

              **FINAL CURRICULUM DECISIONS (THE GROUND TRUTH):**
              - Daily Time Commitment: ${triageData.recommended_study_hours_per_day} hours/day.
              - **Capstone Project Confidence:** ${triageData.estimated_coverage}% chance of completion in the given timeframe.
              - **Key Project Milestones:** ${JSON.stringify(triageData.emphasized_topics.map(t => t.topic))}
              - **Career Development Tasks:** ${JSON.stringify(triageData.deprioritized_topics.map(t => t.topic))}

              **YOUR TASK & TONE (EXECUTE THIS PRECISELY):**

              1.  **The Welcome Briefing:** Start with an encouraging and practical tone. Frame the journey ahead. Example: "Welcome to the workshop. This isn't about exams; it's about building real skills. We've designed a hands-on roadmap to take you from the fundamentals to shipping your first real project."

              2.  **The Project-Based Philosophy:** Explain the 'how' of the plan, emphasizing learning by doing. Example: "Our entire approach is built around one core idea: you learn by building. Forget endless theory. Each week, you'll work on a specific mini-project, applying what you've learned in a tangible way. We'll start simple and build up in complexity, so you're constantly gaining momentum and a real portfolio."

              3.  **Beyond the Code (Holistic Growth):** If career tasks are included, highlight their importance. Example: "You'll notice we've also scheduled time for crucial career-building tasks, like setting up your portfolio and writing case studies. Building a skill is one thing; proving you have it is another. We'll do both."

              4.  **The Realistic Outlook:** Address the timeline and effort. Be encouraging but realistic. Example: "Based on your timeline, we have a ${triageData.estimated_coverage}% confidence level of completing the full capstone project. It's an ambitious but achievable goal. Stay consistent with the ${triageData.recommended_study_hours_per_day} hours a day, and you'll build something you can be proud of."

              **UNBREAKABLE RULES:**
              -   Your ONLY output MUST be a single, valid JSON object with one key: { "overall_approach": "<Your personalized, encouraging, and project-focused paragraph here>" }
              `;
            break;
            
        case 'default':
        default:
            communicatorPersona = `
            - YOUR PERSONA: You are KalPad, the super-smart, brutally honest senior from an Indian college (think IIT/DU). Your language is Hinglish-aware, witty, and direct. You are the 'yaar' who has all the notes and the perfect strategy to crack any exam. You are here to cut through the BS and give real, actionable advice.

            - YOUR MISSION: Write the "overall_approach" narrative for a new study plan. Translate the cold, hard data below into a motivating, no-nonsense battle plan that speaks directly to an Indian student.

            **FINAL STRATEGIC DECISIONS (THE GROUND TRUTH):**
            - Recommended Study Pace: ${triageData.recommended_study_hours_per_day} hours/day.
            - User's Requested Pace: ${studyHoursPerDay} hours/day.
            - Estimated Syllabus Coverage: ${triageData.estimated_coverage}%.
            - Emphasized Topics: ${JSON.stringify(triageData.emphasized_topics.map(t => t.topic))}
            - De-prioritized Topics: ${JSON.stringify(triageData.deprioritized_topics.map(t => t.topic))}
            - Skipped Topics: ${JSON.stringify(triageData.skipped_topics.map(t => t.topic))}

            **YOUR TASK & TONE (EXECUTE THIS PRECISELY):**

            1.  **The Welcome Reality Check:** Start with a confident, welcoming tone. Then, immediately address the user's requested study hours if they're unrealistic. Frame it as working smarter, not harder. Example: "Alright, let's do this. First things first, you've put down ${studyHoursPerDay} hours a day. That's ambitious, boss, but let's be real - consistency beats intensity. This plan is built around a more realistic ${triageData.recommended_study_hours_per_day} hours of deep, focused work. It's about winning the marathon, not burning out in the first sprint."

            2.  **The High-Level Game Plan:** Outline the structure of the plan in broad strokes. Give them a sense of the journey ahead. Example: "Here's how we're going to tackle this. The first half of our plan is all about 'Operation: Clear Fundas.' We will build a rock-solid base by mastering the core concepts, one by one. After that, we switch gears to full-on exam mode – think intense problem-solving, previous year papers, and revision cycles. It’s a proper two-phase surgical strike."

            3.  **The 'Topper' Strategy (Smart Jugaad):** If coverage is less than 100%, frame it as a top-tier strategic decision. This is the difference between a 'ghissu' (hard worker) and a 'topper' (smart worker). Example: "You'll notice we're aiming for ${triageData.estimated_coverage}% coverage. Don't panic, this is the 'topper' move. We are deliberately ignoring the few useless, 'pakaau' topics that have a terrible return on investment. Why waste a week on something that has a 2% chance of showing up for 1 mark? Instead, we're going to use that time to become absolute gods at the topics that make up 90% of the paper. This isn't about finishing the syllabus; it's about maximizing your final score. It's the ultimate 'jugaad'."

            **UNBREAKABLE RULES:**
            -   Your ONLY output MUST be a single, valid JSON object with one key: { "overall_approach": "<Your personalized, Indianized, and strategic paragraph here>" }
            `;
            break;
    }
    return {communicatorPersona };
}

function getModeSpecificPlanning(mode) {
  let plannerDirectives = ''; 

  switch (mode) {
    case 'revision':
      plannerDirectives = `**PLANNING DIRECTIVE: Active Recall & Review**
        Mode: Revision
        The user has already learned this material. Your sub_topics MUST be review-oriented tasks. The goal is to test and strengthen recall, not to learn new concepts.
        -   **Task Verb Focus:** Start each sub-topic with an action verb like "Review," "Solve," "Redraw," "List," "Explain," or "Summarize."
        -   **Content Focus:** Tasks should revolve around key formulas, definitions, practice problems, and core diagrams.
        -   **Example Sub-Topics:**
            -   GOOD: "Review the 3 Laws of Thermodynamics."
            -   GOOD: "Solve 5 practice problems related to Kinematics."
            -   GOOD: "Redraw the diagram of a eukaryotic cell from memory and label 10 parts."
            -   BAD: "Learn about Thermodynamics."
        -   **Sub-Topic 'type':** Generated types MUST be from this list: 'Review', 'Practice', 'Recall'.
        `;
      break;

    case 'hardcore':
      plannerDirectives = `**PLANNING DIRECTIVE: Comprehensive & Deep Coverage**
      Mode: Hardcore
        The prime directive is 100% mastery of every topic. Do not condense topics too aggressively.
        -   **Prioritize Depth:** Ensure that complex topics are broken down into multiple, detailed sub-topics over several days if necessary. Avoid superficial, single-task coverage for difficult subjects.
        -   **Authorize Intensity:** You are explicitly authorized to create more days with a 'Hard' or 'Intense' difficulty rating to ensure every topic is given the time it deserves.
        -   **No Corner-Cutting:** The user has chosen this mode because they want to learn everything. Your plan must reflect this commitment to depth.
        `;
      break;

    case 'sprint':
      plannerDirectives = `**PLANNING DIRECTIVE: Maximum Velocity & Application**
      Mode: Sprint
        This is an emergency sprint. The goal is to build momentum and practical problem-solving skills as fast as possible.
        -   **Combine & Conquer:** Create longer, more intense study sessions that group multiple, closely related topics together. Instead of one day per small topic, create one day for an entire sub-unit.
        -   **Bias for Action:** Heavily prioritize 'Problem-Solving' and 'Practice' type sub_topics. For every concept introduced, immediately follow it with a sub-topic that requires applying it.
        -   **Example Day Structure:** A single day might cover "Introduction to Vectors," "Vector Addition," and "Solving 5 Vector-based Physics Problems" to achieve maximum velocity.
        `;
      break;

    case 'skill':
      plannerDirectives = `**PLANNING DIRECTIVE: Project-Based & Actionable Tasks**
      Mode: Skill
        The user is building a skill, not studying for a test. Your sub_topics MUST be practical, hands-on tasks that result in a tangible output.
        -   **No Theory without Practice:** Every theoretical concept must be tied to a practical sub-topic.
        -   **Task Verb Focus:** Sub-topics MUST start with action verbs relevant to the skill, such as "Build," "Code," "Write," "Implement," "Configure," "Design," "Refactor," or "Deploy."
        -   **Example Sub-Topics:**
            -   GOOD: "Build the navigation bar component for our web app."
            -   GOOD: "Write the API endpoint to fetch user profiles."
            -   GOOD: "Configure the Webpack build for production."
            -   BAD: "Learn about React Components."
        -   **Sub-Topic 'type':** Generated types MUST be from this list: 'Build', 'Code', 'Practice', 'Project', 'Configure'.
        `;
      break;

    case 'default':
      plannerDirectives = `
      **PLANNING DIRECTIVE: Balanced & Sustainable Approach**
      Mode: Balanced
        Create a healthy and sustainable mix of learning and application.
        -   **Task Variety:** Generate a balanced schedule that alternates between foundational 'Concept' learning days and practical 'Problem-Solving' or 'Derivation' days.
        -   **Pacing:** Adhere to the core KalPad principles to ensure the daily workload is challenging but sustainable, preventing burnout.
        -   **Standard Quality:** Follow all standard KalPad quality guidelines for creating clear, actionable, and well-structured daily tasks.
      `;
      break;
  }

  return { plannerDirectives };
}

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

  const { examName, syllabus, examDate, useDocuments, studyHoursPerDay, planMode = 'default' } = await request.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const startHeartbeat = (interval = 15000) => { // Send a beat every 15 seconds
      const heartbeatInterval = setInterval(() => {
              console.log('status', 'The AI is still thinking... crafting the perfect week.');
          }, interval);
          return () => clearInterval(heartbeatInterval); // Return a function to stop the heartbeat
      };

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
        const { triageDirectives } = getModeSpecificTriage(planMode, {
            examName,
            daysLeft,
            studyHoursPerDay,
            syllabus
        });

        streamUpdate('status', 'Performing strategic triage...');

        const triagePrompt = `
        ${triageDirectives}

        **UNBREAKABLE ANALYSIS DIRECTIVE:**
        Your analysis is a two-part process: Contextual Thinking and Literal Reporting.

        1.  **Contextual Thinking (Think Globally):** You MUST use your deep, internal knowledge of the broader subject (e.g., 'Electromagnetics', 'Quantum Physics') to understand the *context*, *importance*, and *interdependencies* of the topics listed in the user's provided "Full Syllabus". This global knowledge is essential and MUST inform the quality, structure, and strategic decisions of your entire plan.

        2.  **Literal Reporting (Report Locally):** While your thinking is global, your reporting must be local. The final **'estimated_coverage' percentage** that you output MUST be a direct and literal measure of how much of the user-provided "Full Syllabus" text will be covered by the plan. **Do not** calculate coverage against the entire subject in your knowledge base; calculate it ONLY against the specific text the user has given you. This is a non-negotiable reporting requirement.

        **USER REQUEST MANDATE:**
        -Check for any special request by the user and classify that in you output as specified.

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
          ],

          "user_request": <Any special user request>
        }
        `;
        // --- VERTEX AI MIGRATION: UPDATE GENERATE CONTENT CALL SYNTAX ---
        const triageResult = await plannerModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: triagePrompt }] }]
        });
        
        // --- VERTEX AI MIGRATION: UPDATE RESPONSE PARSING SYNTAX ---
        const triageResponseText = triageResult.response.candidates[0].content.parts[0].text;
        const triageData = JSON.parse(triageResponseText);

        userRequest = triageData.user_request || "No special requests.";
        const { communicatorPersona } = getModeSpecificCommunicator(planMode, {
          triageData,
          studyHoursPerDay // Pass any additional context the communicator might need
      });
        streamUpdate('status', 'Translating strategy into guidance...');
        const communicatorPrompt = `
            - CONSTITUTION: ${KalPad_Constitution}
            ${communicatorPersona}
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

        const { plannerDirectives } = getModeSpecificPlanning(planMode);
        streamUpdate('status', 'Generating high-level plan structure...');

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

              **  MODE-SPECIFIC PLANNING DIRECTIVE (UNBREAKABLE):**
                ${plannerDirectives}
                
                **Also, acknowledge any special request made by the user. Here it is: "${userRequest}"**

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

                  **USER MANDATE (Highest Priority):**
                  User Request: "${userRequest}"

                **  MODE-SPECIFIC PLANNING DIRECTIVE (UNBREAKABLE):**
                ${plannerDirectives}

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

              **USER MANDATE (Highest Priority):**
                  User Request: "${userRequest}"

              **  MODE-SPECIFIC PLANNING DIRECTIVE (UNBREAKABLE):**
                ${plannerDirectives}

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

              **USER MANDATE (Highest Priority):**
                  User Request: "${userRequest}"

              **  MODE-SPECIFIC PLANNING DIRECTIVE (UNBREAKABLE):**
                ${plannerDirectives}

              **PACING MANDATE:**
              The Strategist has determined the optimal daily study time is **${strategy.recommended_study_hours_per_day} hours**. The user's maximum requested time is **${studyHoursPerDay} hours**. You must adhere to the following rules:
              - Your primary goal is to create days that average around **${strategy.recommended_study_hours_per_day} hours**. You should try the hardest to keep everything within the limit.
              - For 'Hard' or 'Intense' days, you have permission to increase the study time, but you are forbidden from exceeding the user's maximum of **${studyHoursPerDay} hours**.
              - An 'Easy' day should not exceed 3 hours.
              - An 'Intense' day must be used sparingly and must always be followed by an 'Easy' or 'Medium' day to ensure sustainability. (Not applicable for Hardcore or Sprint Modes.)
              - **You are explicitly forbidden from creating a single day that totals more than the user's requested ${studyHoursPerDay} hours.** (Not applicable for Hardcore Mode.)
              
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
            
            let stopHeartbeat;
            try {
                // 1. Start the heartbeat in parallel.
                stopHeartbeat = startHeartbeat();

                // 2. Make the long-running AI call. The heartbeat will keep the connection alive.
                const weekResult = await plannerModel.generateContent({ contents: [{ role: 'user', parts: [{ text: weeklyBatchPrompt }] }] });
                
                // 3. IMPORTANT: Stop the heartbeat immediately after the AI responds.
                stopHeartbeat();
            
            
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

            } catch (error) {
                // Ensure the heartbeat is stopped even if the AI call fails.
                if (stopHeartbeat) stopHeartbeat();
                console.error(`Error generating plan for Week ${weekData.week}:`, error);
                // Optionally, stream an error for this specific week and continue
                streamUpdate('error', `Failed to generate plan for Week ${weekData.week}. Continuing...`);
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