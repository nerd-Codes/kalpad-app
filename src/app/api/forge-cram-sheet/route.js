// src/app/api/forge-cram-sheet/route.js

import { getVertexAIModel } from '@/lib/vertexai';
import { logRouteResult, resolveRouteAuth, unauthorizedResponse } from '@/lib/routeAuth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const auth = await resolveRouteAuth(request);
    const authMode = auth.authMode;
    const { supabase, user } = auth;
    if (!user) {
        logRouteResult('/api/forge-cram-sheet', authMode, 401);
        return unauthorizedResponse();
    }

    const { plan_id } = await request.json();
    if (!plan_id) {
        return new Response(JSON.stringify({ error: 'Plan ID is required' }), { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const streamUpdate = (type, data) => {
                try {
                    const payload = JSON.stringify({ type, data });
                    controller.enqueue(encoder.encode(payload + '\n---\n'));
                } catch (e) {
                    console.warn(`Could not stream update ('${type}') to a closed controller.`);
                }
            };

            let cramSheetId = null;

            try {
                // --- Step 1: Initial DB Setup ---
                const { data: newSheet, error: insertError } = await supabase
                    .from('generated_cram_sheets')
                    .insert({ plan_id, user_id: user.id, status: 'in_progress' })
                    .select('id')
                    .single();

                if (insertError) {
                    if (insertError.code === '23505') { // unique_violation
                         const { data: updatedSheet, error: updateError } = await supabase
                            .from('generated_cram_sheets')
                            .update({ status: 'in_progress', markdown_content: null })
                            .eq('plan_id', plan_id)
                            .eq('user_id', user.id)
                            .select('id')
                            .single();
                        if (updateError) throw new Error(`DB conflict and update failed: ${updateError.message}`);
                        cramSheetId = updatedSheet.id;
                    } else {
                        throw new Error(`DB insert error: ${insertError.message}`);
                    }
                } else {
                    cramSheetId = newSheet.id;
                }
                
                streamUpdate('status', { title: 'Fetching plan data...' });

                // --- Step 2: Fetch Plan Data (INCLUDING EXAM NAME) ---
                const { data: masterPlanData, error: masterPlanError } = await supabase
                    .from('study_plans')
                    .select(`
                        exam_name,
                        plan_topics (
                            day, topic_name, sub_topics,
                            generated_notes ( notes_markdown )
                        )
                    `)
                    .eq('id', plan_id)
                    .single();
                
                if (masterPlanError) throw new Error(`Failed to fetch master plan: ${masterPlanError.message}`);
                
                const examName = masterPlanData.exam_name;
                const planData = masterPlanData.plan_topics.sort((a, b) => a.day - b.day);

                // --- Step 3: The "Miner" Agent (Throttled Map Step) ---
                streamUpdate('status', { title: 'Mining key concepts from your plan... (0%)' });
                const minerModel = await getVertexAIModel('gemini-2.5-pro', { responseMimeType: "application/json" });
                
                const minerResults = [];
                const MINER_BATCH_SIZE = 5; 
                
                for (let i = 0; i < planData.length; i += MINER_BATCH_SIZE) {
                    const batch = planData.slice(i, i + MINER_BATCH_SIZE);
                    
                    const batchPromises = batch.map(async (day) => {
                        const sourceText = day.generated_notes[0]?.notes_markdown || `Topic: ${day.topic_name}. Sub-topics: ${day.sub_topics.map(st => st.text).join(', ')}`;
                        
                        // --- ENHANCED MINER PROMPT ---
                        const minerPrompt = `
                            You are a meticulous Academic Auditor AI.
                            **CONTEXT:** The student is preparing for the **"${examName}"** exam.
                            
                            **TASK:** Extract every key formula, definition, and concept from the source text below.
                            Your extraction MUST be relevant to the context of the exam. 
                            - For competitive exams (JEE, GATE), prioritize numerical formulas and core theorems.
                            - For theoretical exams (UPSC, Boards), prioritize definitions and conceptual flows.
                            
                            **SOURCE:**
                            Topic: "${day.topic_name}"
                            Text: """${sourceText.substring(0, 15000)}""" 

                            **OUTPUT JSON (STRICT):**
                            {
                                "key_formulas": ["LaTeX strings"],
                                "key_definitions": ["Concise sentences"],
                                "key_concepts": ["Bullet points"]
                            }
                        `;
                        
                        try {
                            const result = await minerModel.generateContent({
                                contents: [{ role: 'user', parts: [{ text: minerPrompt }] }]
                            });
                            return {
                                day: day.day,
                                topic_name: day.topic_name,
                                ...JSON.parse(result.response.candidates[0].content.parts[0].text)
                            };
                        } catch (e) {
                            console.warn(`Miner failed for day ${day.day}`, e);
                            return null;
                        }
                    });

                    const batchResults = await Promise.all(batchPromises);
                    minerResults.push(...batchResults.filter(r => r !== null));
                    
                    const progress = Math.round(((i + batch.length) / planData.length) * 100);
                    streamUpdate('status', { title: `Mining key concepts from your plan... (${progress}%)` });
                }

                // --- Step 4: The "Synthesizer" Agent (Iterative Reduce Step) ---
                streamUpdate('status', { title: 'Synthesizing knowledge into a Cram Sheet...' });
                const synthesizerModel = await getVertexAIModel('gemini-2.5-pro');

                let finalCramSheet = ``;
                const chunkSize = 5; 
                
                for (let i = 0; i < minerResults.length; i += chunkSize) {
                    const chunk = minerResults.slice(i, i + chunkSize);
                    
                    // --- HIGH-FIDELITY SYNTHESIZER PROMPT ---
                    const synthesizerPrompt = `
                        **ROLE:** You are a Senior Academic Strategist and Master Information Architect. Your task is to transform raw data into a "Level 10" Cram Sheet—the kind used by toppers for high-stakes exams.

                        **MISSION:** Create a high-density, exam-ready document for: "${examName}". 

                        **CONTEXT:**
                        - **Current Progress:** 
                        ---
                        ${finalCramSheet.slice(-2500)}
                        ---
                        - **New Batch Data to Integrate:**
                        ---
                        ${JSON.stringify(chunk, null, 2)}
                        ---

                        **CRITICAL INSTRUCTIONS (EXECUTE WITH PEDANTIC PRECISION):**

                        1.  **DETECT SUBJECT DNA (DYNAMIC FORMATTING):**
                            - **Quantitative Topics (Physics/Math/Eng):** Use a "Formula-First" layout. State the formula clearly, define variables in a list, and follow with "Quick Intuition" bullet points.
                            - **Qualitative Topics (Bio/Arts/Social):** Use a "Hierarchical" layout. Use Bold terms followed by clear definitions and "Cause-and-Effect" arrows (A -> B).

                        2.  **THE "STORY" CLUSTER ENGINE:**
                            - DO NOT list days (e.g., "Day 4: ..."). 
                            - CLUSTER the data by **Academic Significance**. If three days of data all relate to "Nuclear Physics," group them under one '## Nuclear Physics' heading.
                            - ARCHITECT the flow from Foundational Principles to Advanced Edge Cases.

                        3.  **SYNTHESIZE & DEDUP:**
                            - If a formula appears in multiple entries, identify the "Master Version" and list it once.
                            - Use "Pro-Tips" or "Common Traps" in blockquotes (\`>\`) to warn the student about common exam errors related to these specific topics.

                        4.  **BE RUTHLESSLY CONCISE:**
                            - No fluff. No "This section covers...". 
                            - Every word must be a potential mark in the exam.
                            - Bold the first instance of every technical term.

                        **LATEX STYLE GUIDE (THESE ARE UNBREAKABLE LAWS FOR KATEX COMPATIBILITY):**
                            
                            1.  **DELIMITERS:** You MUST use \`$ ... $\` for inline math and \`$$ ... $$\` for display math. You are FORBIDDEN from using \`\\[ ... \\]\` or \`\\( ... \\)\`.
                            
                            2.  **ENVIRONMENTS:** You are RESTRICTED to ONLY the following environments: \`{matrix}\`, \`{pmatrix}\`, \`{bmatrix}\`, \`{Vmatrix}\`, \`{vmatrix}\`, \`{align}\`, \`{aligned}\`, \`{cases}\`. You are STRICTLY FORBIDDEN from using unsupported environments like \`{equation}\`, \`{eqnarray}\`, or \`{gather}\`.
                            
                            3.  **COMMANDS:** Do not use exotic or non-standard packages/commands. Stick to common, vanilla LaTeX commands.
                            
                            4.  **SPECIAL CHARACTERS:** Inside any math block ($ or $$), you MUST escape the following characters with a backslash:
                                -   Percent sign: \`\\% \`
                                -   Underscore: \`\\_ \`
                                -   Ampersand: \`\\& \` (Except inside an \`{align}\` environment)
                        
                            5.  **CLARITY AND CORRECTNESS:**
                                -   Ensure all brackets, braces, and parentheses are correctly matched and closed.
                                -   NEVER nest a display math block ($$) inside another display math block.

                        **OUTPUT:** Return ONLY the Markdown text. Begin immediately with the first relevant heading.
                    `;

                    const result = await synthesizerModel.generateContent({
                        contents: [{ role: 'user', parts: [{ text: synthesizerPrompt }] }]
                    });

                    const newSection = result.response.candidates[0].content.parts[0].text;
                    finalCramSheet += newSection + "\n\n";
                }

                // --- Step 5: Final DB Update ---
                const { error: updateError } = await supabase
                    .from('generated_cram_sheets')
                    .update({ markdown_content: finalCramSheet, status: 'complete' })
                    .eq('id', cramSheetId);
                
                if (updateError) throw new Error(`Failed to save final cram sheet: ${updateError.message}`);
                
                // --- Step 6: Stream Completion Signal ---
                streamUpdate('complete', { cramSheetId: cramSheetId });
                controller.close();

            } catch (error) {
                console.error("Critical Error in Forge stream:", error);
                if (cramSheetId) {
                    await supabase.from('generated_cram_sheets').update({ status: 'error' }).eq('id', cramSheetId);
                }
                streamUpdate('error', { message: error.message || 'An unknown error occurred during forgery.' });
                controller.close();
            }
        }
    });

    logRouteResult('/api/forge-cram-sheet', authMode, 200);
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
