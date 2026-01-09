// src/app/api/generate-plan/route.js

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getVertexAIModel } from '@/lib/vertexai';

export const dynamic = 'force-dynamic';

// --- UTILITY: JSON SANITIZER ---
function cleanJSON(text) {
    try {
        let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(clean);
    } catch (e) {
        console.error("JSON Parse Error. Raw text:", text);
        try {
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start !== -1 && end !== -1) return JSON.parse(text.substring(start, end + 1));
        } catch (e2) { throw new Error("AI returned malformed data."); }
        throw e;
    }
}

// --- 1. THE CONSTITUTION ---
const KalPad_Constitution = `
**SYSTEM DIRECTIVES (NON-NEGOTIABLE):**
1.  **NO PASSIVITY:** You are forbidden from using verbs like "Read", "Study", "Learn", or "Understand". You must use high-utility action verbs: "Derive", "Solve", "Critique", "Build", "Debug", "Memorize", "Simulate".
2.  **RUTHLESS TRIAGE:** You are a triage officer. If a topic has low exam weightage and high time cost, you MUST discard it (unless Mode is Hardcore).
3.  **DEPENDENCY RESPECT:** Do not schedule advanced topics before their mathematical or conceptual foundations.
4.  **ELASTIC DEPTH:** 
    - If Time is Tight: Switch to "Reverse Engineering" (Start with questions, ignore theory).
    - If Time is Ample: Switch to "First Principles" (Derive from scratch).
`;

function getModeConfig(mode) {
    switch (mode) {
        case 'revision':
            return {
                role: "Revision Specialist",
                triageStrictness: 0.1,
                depthStrategy: "Breadth-First Recall",
                verbSet: ["Recall", "Test", "Summarize", "Flashcard", "Speed-Run", "Verify"],
                allowSkipping: false
            };
        case 'hardcore':
            return {
                role: "Completionist Drill Sergeant",
                triageStrictness: 0.0,
                depthStrategy: "Maximum Depth",
                verbSet: ["Master", "Derive", "Internalize", "Prove", "Deconstruct"],
                allowSkipping: false
            };
        case 'sprint':
            return {
                role: "High-Yield Sniper",
                triageStrictness: 0.9,
                depthStrategy: "Selective Deep Dive",
                verbSet: ["Solve", "Hack", "Memorize Pattern", "Apply", "Reverse-Engineer"],
                allowSkipping: true
            };
        case 'skill':
            return {
                role: "Technical Architect",
                triageStrictness: 0.5,
                depthStrategy: "Project-Based Learning",
                verbSet: ["Build", "Code", "Debug", "Deploy", "Refactor", "Implement"],
                allowSkipping: true
            };
        case 'default':
        default:
            return {
                role: "Strategic Optimiser",
                triageStrictness: 0.4,
                depthStrategy: "Elastic ROI",
                verbSet: ["Analyze", "Practice", "Solve", "Calculate", "Draft"],
                allowSkipping: true
            };
    }
}

// --- 2. API HANDLER ---
export async function POST(request) {
    const supabase = createRouteHandlerClient({ cookies });
    let session;
    let isGuest = false;

    // --- AUTHENTICATION ---
    const isGuestRequest = request.headers.get('x-is-guest') === 'true';
    const authHeader = request.headers.get('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const jwt = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(jwt);
        if (user) session = { user };
    } else {
        const { data } = await supabase.auth.getSession();
        session = data.session;
    }

    if (!session) {
        if (isGuestRequest) isGuest = true;
        else return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { examName, syllabus, examDate, useDocuments, studyHoursPerDay, planMode = 'default' } = await request.json();

    // Guest Limits
    const today = new Date();
    const examDateObj = new Date(examDate);
    const diffTime = Math.abs(examDateObj - today);
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (isGuest && daysLeft > 7) return new Response(JSON.stringify({ error: 'Guest plans limited to 7 days.' }), { status: 403 });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const streamUpdate = (type, message) => {
                try {
                    const payload = JSON.stringify({ type, data: { message } });
                    controller.enqueue(encoder.encode(payload + '\n---\n'));
                } catch (e) { console.warn("Stream closed"); }
            };

            const startHeartbeat = () => {
                const interval = setInterval(() => { /* Pulse */ }, 15000);
                return () => clearInterval(interval);
            };

            try {
                streamUpdate('status', 'Initializing Strategic Engines...');
                const modeConfig = getModeConfig(planMode);

                // Initialize Vertex AI
                const flashModel = await getVertexAIModel('gemini-2.5-flash');
                const proModel = await getVertexAIModel('gemini-2.5-pro');

                // --- PHASE 1: THE AUDIT (RED TEAM) ---
                streamUpdate('status', 'Deploying Red Team Analysis...');

                // 1.1 Red Team Analysis Prompt
                const redTeamPrompt = `
                    **ROLE:** Adversarial Academic Auditor (Red Team).
                    **OBJECTIVE:** Analyze the syllabus for "${examName}" to find hidden failure points.
                    
                    **INPUT SYLLABUS:**
                    """${syllabus.substring(0, 15000)}"""

                    **ANALYSIS PROTOCOLS:**
                    1.  **Hidden Prerequisites:** Identify concepts NOT explicitly listed but mathematically required (e.g., "Cannot do Fluid Dynamics without Calculus III").
                    2.  **Trap Topics:** Identify topics that look easy/short but are deceptively time-consuming or have low ROI.
                    3.  **The Kill Chain:** What is the sequence of concepts that, if skipped, causes total failure in later units?

                    **OUTPUT FORMAT (JSON ONLY):**
                    {
                        "risks": ["Specific warning about a trap topic", "Warning about time estimation"],
                        "hidden_dependencies": ["Concept A requires Concept B (not listed)"],
                        "trap_topics": ["Topic X"]
                    }
                `;
                
                const redTeamRes = await flashModel.generateContent({ contents: [{ role: 'user', parts: [{ text: redTeamPrompt }] }] });
                const redTeamReport = cleanJSON(redTeamRes.response.candidates[0].content.parts[0].text);

                // 1.2 Context Fallback
                const ragContext = "Syllabus analyzed directly via Red Team.";

                // --- PHASE 2: THE STRATEGY (SYNTHESIS) ---
                streamUpdate('status', 'Formulating Master Strategy...');

                // 2.1 Master Strategy Prompt
                const strategyPrompt = `
                    ${KalPad_Constitution}
                    
                    **ROLE:** Lead Strategist ("${modeConfig.role}")
                    **MODE:** ${planMode.toUpperCase()}
                    **CONTEXT:** User has ${daysLeft} days, ${studyHoursPerDay} hours/day.
                    
                    **INTELLIGENCE REPORT:**
                    - Red Team Risks: ${JSON.stringify(redTeamReport.risks)}
                    - Hidden Dependencies: ${JSON.stringify(redTeamReport.hidden_dependencies)}
                    
                    ***CALCULATION TASK (Internal):**
                    1.  Estimate total hours required to cover this syllabus at "Textbook Depth".
                    2.  Compare with actual available hours (${daysLeft * studyHoursPerDay}).
                    3.  If Ideal > Actual, you MUST trigger "Compression Protocols".
                    4.  **SANITY CHECK:** If the user's Total Available Hours is greater than or equal to the syllabus's stated lecture hours, DO NOT trigger 'hostile' or 'ruthless' protocols unless the content is exceptionally dense. Default to a 'Deep Dive' strategy instead.
                    
                    **DECISION MATRIX:**
                    - If Mode is 'Sprint': CUT everything except the top 20% high-yield topics.
                    - If Mode is 'Hardcore': Keep everything, but warn the user they must increase hours.
                    - If Mode is 'Balanced': Cut the bottom 20% (low yield, high effort).

                    **OUTPUT FORMAT (JSON ONLY):**
                    {
                        "estimated_coverage": (integer 0-100),
                        "recommended_study_hours_per_day": (integer, can be higher than requested if Hardcore),
                        "emphasized_topics": [ { "topic": "Name", "justification": "Why this is high yield" } ],
                        "skipped_topics": [ { "topic": "Name", "justification": "Why it was cut" } ],
                        "deprioritized_topics": [ { "topic": "Name", "justification": "Why low priority" } ],
                        "overall_approach": "A brutally honest, direct paragraph explaining the strategy. Use the persona: ${modeConfig.role}. Mention the Red Team risks found."
                    }
                `;

                const strategyRes = await proModel.generateContent({ contents: [{ role: 'user', parts: [{ text: strategyPrompt }] }] });
                const strategyData = cleanJSON(strategyRes.response.candidates[0].content.parts[0].text);

                // Stream Strategy
                controller.enqueue(encoder.encode(JSON.stringify({ type: 'strategy', data: strategyData }) + '\n---\n'));

                // --- PHASE 2.5: GOLDEN QUESTIONS ---
                streamUpdate('status', 'Forging Golden Questions...');
                let goldenQuestions = {};
                
                if (strategyData.emphasized_topics && strategyData.emphasized_topics.length > 0) {
                    const goldenPrompt = `
                        **TASK:** Generate Golden Questions.
                        **INPUT:** List of High-Yield Topics: ${JSON.stringify(strategyData.emphasized_topics.map(t => t.topic).slice(0, 5))}
                        
                        **DEFINITION:** A "Golden Question" is the single most archetypal, high-probability exam problem for a topic. It serves as the "Definition of Done". It should be a specific problem statement, not a generic topic.
                        
                        **OUTPUT:** JSON { "Topic Name": "Calculate the entropy change when..." }
                    `;
                    
                    const goldenRes = await flashModel.generateContent({ contents: [{ role: 'user', parts: [{ text: goldenPrompt }] }] });
                    try {
                         goldenQuestions = cleanJSON(goldenRes.response.candidates[0].content.parts[0].text);
                    } catch (e) {
                        console.warn("Golden Question generation failed, proceeding without them.");
                    }
                }

                // --- PHASE 3: THE EXECUTION (WEEKLY BATCHING) ---
                streamUpdate('status', 'Tactical Planning...');

                let dayCounter = 0;
                let plannedTopicsHistory = [];
                // Pacing is handled by prompt context now

                while (dayCounter < daysLeft) {
                    const daysInBatch = Math.min(7, daysLeft - dayCounter); 
                    const startDay = dayCounter + 1;
                    
                    streamUpdate('status', `Planning Days ${startDay} - ${startDay + daysInBatch - 1}...`);

                    const batchPrompt = `
                        ${KalPad_Constitution}
                        **ROLE:** Weekly Tactical Foreman.
                        **MODE:** ${planMode.toUpperCase()} (${modeConfig.depthStrategy})
                        
                        **MASTER STRATEGY:**
                        - Approach: ${strategyData.overall_approach}
                        - EMPHASIZE: ${JSON.stringify(strategyData.emphasized_topics)}
                        - SKIP (FORBIDDEN): ${JSON.stringify(strategyData.skipped_topics)}
                        
                        **GOLDEN QUESTIONS (MANDATORY INJECTION):**
                        ${JSON.stringify(goldenQuestions)}
                        *Instruction:* If you schedule a topic that has a Golden Question, you MUST append the question text to the 'day_summary'.

                        **PACING:** Target ${strategyData.recommended_study_hours_per_day} hours. Max ${studyHoursPerDay}.
                        **VERB SET:** ${JSON.stringify(modeConfig.verbSet)}

                        **HISTORY (DO NOT REPEAT):** ${JSON.stringify(plannedTopicsHistory)}

                        **TASK:** Generate plan for Days ${startDay} to ${startDay + daysInBatch - 1}.
                        
                        **JSON SCHEMA (STRICT):**
                        {
                            "weekly_plan": [
                                {
                                    "day": (integer ${startDay} to ${startDay + daysInBatch - 1}),
                                    "topic_name": "String",
                                    "study_hours": (integer),
                                    "importance": (1-10),
                                    "day_difficulty": "Easy" | "Medium" | "Hard" | "Intense",
                                    "day_summary": "Concise goal. Include Golden Question if applicable.",
                                    "sub_topics": [ 
                                        { 
                                            "text": "Action verb + Task", 
                                            "type": "Concept" | "Practice" | "Review" | "Derivation", 
                                            "difficulty": "Easy" | "Medium" | "Hard",
                                            "completed": false
                                        } 
                                    ]
                                }
                            ]
                        }
                    `;

                    const stopHeartbeat = startHeartbeat();
                    const batchRes = await proModel.generateContent({ contents: [{ role: 'user', parts: [{ text: batchPrompt }] }] });
                    stopHeartbeat();

                    const batchData = cleanJSON(batchRes.response.candidates[0].content.parts[0].text);
                    
                    if (batchData.weekly_plan && Array.isArray(batchData.weekly_plan)) {
                        for (const dayPlan of batchData.weekly_plan) {
                            const dateObj = new Date();
                            // Logic: Start Date = Tomorrow. Offset = dayPlan.day (1-based index)
                            dateObj.setDate(dateObj.getDate() + dayPlan.day); 
                            dayPlan.date = dateObj.toISOString().split('T')[0];
                            
                            // Ensure day number is absolute sequence
                            dayPlan.day = dayCounter + (dayPlan.day - (batchData.weekly_plan[0].day - 1)); 

                            plannedTopicsHistory.push(dayPlan.topic_name);
                            controller.enqueue(encoder.encode(JSON.stringify({ type: 'plan_topic', data: dayPlan }) + '\n---\n'));
                        }
                    }

                    dayCounter += daysInBatch;
                }

                controller.close();

            } catch (error) {
                console.error("Critical Failure:", error);
                streamUpdate('error', "The AI Strategist encountered an error: " + error.message);
                controller.close();
            }
        }
    });

    return new Response(stream, { headers: { 'Content-Type': 'application/json' } });
}