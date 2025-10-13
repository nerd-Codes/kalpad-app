// /src/app/api/forge-cram-sheet/route.js

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getVertexAIModel } from '@/lib/vertexai';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
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
                // --- Step 1: Initial DB Setup & Status Update ---
                const { data: newSheet, error: insertError } = await supabase
                    .from('generated_cram_sheets')
                    .insert({ plan_id, user_id: session.user.id, status: 'in_progress' })
                    .select('id')
                    .single();

                if (insertError) {
                    // Handle potential conflict if a sheet already exists but is in a failed state
                    if (insertError.code === '23505') { // unique_violation
                         const { data: updatedSheet, error: updateError } = await supabase
                            .from('generated_cram_sheets')
                            .update({ status: 'in_progress', markdown_content: null })
                            .eq('plan_id', plan_id)
                            .eq('user_id', session.user.id)
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

                // --- Step 2: Fetch all plan data ---
                const { data: planData, error: planError } = await supabase
                    .from('plan_topics')
                    .select('day, topic_name, sub_topics, generated_notes(notes_markdown)')
                    .eq('plan_id', plan_id)
                    .order('day');

                if (planError) throw new Error(`Failed to fetch plan topics: ${planError.message}`);
                
                // --- Step 3: The "Miner" Agent (Map Step) ---
                streamUpdate('status', { title: 'Mining key concepts from your plan... (0%)' });
                const minerModel = await getVertexAIModel('gemini-2.5-flash', { responseMimeType: "application/json" });
                
                const minerPromises = planData.map(async (day) => {
                    // Prioritize rich generated notes, fall back to topic titles
                    const sourceText = day.generated_notes[0]?.notes_markdown || 
                                       `Topic: ${day.topic_name}. Sub-topics: ${day.sub_topics.map(st => st.text).join(', ')}`;
                    
                    const minerPrompt = `
                        You are a meticulous and exhaustive Academic Auditor AI. Your sole function is to deconstruct the provided academic material into a structured, exhaustive list of its most important components. You do not make strategic judgments; you extract and categorize with perfect fidelity.

                        **INPUTS:**

                        1.  **Syllabus Checklist (The Ground Truth):**
                            """
                            - Topic Name: "${day.topic_name}"
                            - Sub-Topics: ${day.sub_topics.map(t => t.text).join(', ')}
                            """

                        2.  **Source Notes (The Knowledge Base):**
                            """
                            ${sourceText || 'No source notes provided. Use your internal knowledge.'} 
                            """

                        **YOUR THREE-STEP TASK:**

                        1.  **Exhaustive Extraction:** Read the **Source Notes**. If they are empty, use your own deep internal knowledge. Extract every single relevant formula, definition, and core concept that relates to the topics in the **Syllabus Checklist**.

                        2.  **ZERO-DEFECT AUDIT ALGORITHM:**
                            2.1.  **Create Checklist:** First, create a literal, internal checklist of every single topic, sub-topic, and named concept from the input.
                            2.2.  **Exhaustive Extraction:** Perform your primary task of extracting all key information from the input or your internal knowledge.
                            2.3.  **Final Audit Pass:** Before you output your final JSON, you MUST iterate through your internal checklist from Step 2.1 with pedantic, literal-minded precision. For each and every item, you must verify that the exact term or a very close semantic equivalent is present in your extracted key_definitions or key_concepts. Do not assume any topic is "implicitly covered." If there is a term on the checklist, the same must be in your output. Failure to include every single item from the checklist is a critical failure of your primary function.

                        3.  **Final Formatting:** Ensure your final output is dense and high-yield. "Concise" means no filler words or introductory sentences, not missing information.

                        **CRITICAL JSON SCHEMA (Your ONLY output must be this object):**
                        {
                        "key_formulas": [
                            "Every relevant formula, in valid LaTeX."
                        ],
                        "key_definitions": [
                            "A single, clear sentence defining every key term from the checklist and source notes."
                        ],
                        "key_concepts": [
                            "A concise bullet point explaining every core concept, principle, or theorem from the checklist and source notes."
                        ]
                        }
                        `;
                    
                    const result = await minerModel.generateContent({
                        contents: [{ role: 'user', parts: [{ text: minerPrompt }] }]
                    });

                    return {
                        day: day.day,
                        topic_name: day.topic_name,
                        ...JSON.parse(result.response.candidates[0].content.parts[0].text)
                    };
                });

                // Execute in parallel and update progress
                const minerResults = [];
                for (const promise of minerPromises) {
                    minerResults.push(await promise);
                    const progress = Math.round((minerResults.length / planData.length) * 100);
                    streamUpdate('status', { title: `Mining key concepts from your plan... (${progress}%)` });
                }

                // --- Step 4: The "Synthesizer" Agent (Iterative Reduce Step) ---
                streamUpdate('status', { title: 'Synthesizing knowledge into a Cram Sheet...' });
                const synthesizerModel = await getVertexAIModel('gemini-2.5-flash');

                let finalCramSheet = `\n\n`; // Initial title
                
                // Process in chunks to avoid context limits
                const chunkSize = 5; 
                for (let i = 0; i < minerResults.length; i += chunkSize) {
                    const chunk = minerResults.slice(i, i + chunkSize);
                    
                    const synthesizerPrompt = `
                        You are an expert academic author and a master information architect. Your task is to transform the following raw, day-by-day data dump into a single, cohesive, brilliantly structured "Cram Sheet" for a student's last-minute revision.

                        **Existing Cram Sheet (for context only, do not repeat its content):**
                        ---
                        ${finalCramSheet.slice(-2000)}
                        ---

                        **New Raw Data to Synthesize and Append:**
                        ---
                        ${JSON.stringify(chunk, null, 2)}
                        ---

                        **CRITICAL INSTRUCTIONS (YOUR MANDATORY THOUGHT PROCESS):**

                        1.  **Architect, Don't Just List:** Your first and most important job is to find the "story" in the data. Do NOT just list the days sequentially. You MUST intelligently group related topics under larger, more meaningful headings (e.g., a single "## 1D Schrödinger Solutions" section that synthesizes data from multiple days).

                        2.  **Synthesize, Don't Repeat:** Read the entire data dump first. If you see a recurring concept or formula, introduce and define it once in the most logical place. Your goal is to create a dense, non-redundant document.

                        3.  **Be Ruthlessly Concise:** Every word on this sheet must be high-yield. Use clear headings ('##', '###'), bullet points for definitions and concepts, and LaTeX for all formulas. Do not add conversational text, introductions, or conclusions. Jump straight to the critical information.


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

                        **Your ONLY output should be a single, complete, beautifully formatted Markdown document.**
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
                // Attempt to update the DB record to 'error' state
                if (cramSheetId) {
                    await supabase.from('generated_cram_sheets').update({ status: 'error' }).eq('id', cramSheetId);
                }
                streamUpdate('error', { message: error.message || 'An unknown error occurred during forgery.' });
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}