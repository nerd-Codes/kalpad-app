// src/app/api/inngest/route.js

import { inngest } from "@/lib/inngest";
import { serve } from "inngest/next";
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Innertube } from 'youtubei.js';
import fetch from 'node-fetch';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { getVertexAIModel } from "@/lib/vertexai";
import axios from 'axios'; // Using Axios for robust binary handling
import { generateEmbeddings } from "@/lib/vertexEmbedding";

import which from 'which'; 

const preferredLangs = ['en-IN', 'hi-IN', 'en-US'];

// Initialize Supabase Admin Client for server-side operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return 'http://localhost:3000';
};

const INTERNAL_SCOUT_URL = `https://kalpad-app.vercel.app/api/internal/lecture-scout`;

// --- HELPER: Set Cover Algorithm (Unchanged logic, adapted data) ---
function solveSetCover(candidates, requiredTopics) {
    let finalPlaylist = [];
    let uncoveredTopics = new Set(requiredTopics);
    
    // Deep copy
    let pool = JSON.parse(JSON.stringify(candidates));

    // Filter out low-quality garbage
    pool = pool.filter(v => v.relevance_score >= 60 && v.covered_topics.length > 0);

    while (uncoveredTopics.size > 0 && pool.length > 0) {
        pool.forEach(video => {
            // Calculate Utility: How many *new* topics does this video solve?
            video.new_topic_count = video.covered_topics.filter(t => uncoveredTopics.has(t)).length;
            
            // Efficiency Score: (Relevance * New Topics) / Duration Penalty?
            // For now, raw utility * relevance is best.
            video.efficiency = video.new_topic_count * video.relevance_score;
        });

        // Sort by Efficiency Descending
        pool.sort((a, b) => b.efficiency - a.efficiency);

        const bestVideo = pool[0];

        // If even the best video adds 0 value, stop.
        if (bestVideo.new_topic_count === 0) break;

        finalPlaylist.push(bestVideo);
        
        // Mark topics as covered
        bestVideo.covered_topics.forEach(t => uncoveredTopics.delete(t));

        // Remove from pool
        pool.shift();
    }
    return finalPlaylist;
}

// --- MAIN PIPELINE ---
// --- THE MAIN CURATION PIPELINE ---
const curationPipeline = inngest.createFunction(
    { id: "lecture-scout-orchestrator", name: "Lecture Scout Orchestrator", concurrency: 4 },
    { event: "lecture-scout/curation.requested" },
    async ({ event, step }) => {
        const { job_id, sub_topics_to_curate, user_timezone } = event.data;
        const SCOUT_URL = process.env.LECTURE_SCOUT_URL; 
        if (!SCOUT_URL) throw new Error("LECTURE_SCOUT_URL missing");

        const rawTopicTexts = sub_topics_to_curate.map(t => t.text);
        const examName = sub_topics_to_curate[0]?.exam_name || "General Exam";

        await step.run("update-status", async () => {
            await supabaseAdmin.from('curation_jobs').update({ status: 'in_progress' }).eq('id', job_id);
        });

        // --- STEP 1: Filter & Cluster (Refined Logic) ---
        const { clusters, lecture_worthy_topics } = await step.run("filter-and-cluster", async () => {
            const model = await getVertexAIModel("gemini-2.5-flash", { responseMimeType: "application/json" });
            const prompt = `
            You are an Academic Curator.
            **INPUT TOPICS:** ${JSON.stringify(rawTopicTexts)}
            
            **TASK 1: FILTER (The "Homework" Gate)**
            - **KEEP:** Concepts, Theories, Derivations, "How to interpret...", "Demonstration of...", "Mechanism of...".
            - **DISCARD:** "Solve Q1-10", "Practice Sheet", "Quiz", "Take notes".
            - *Nuance:* "Practice interpreting spectra" is a SKILL (Keep). "Solve 50 spectra problems" is a DRILL (Discard).
            
            **TASK 2: CLUSTER (The "Context" Grouping)**
            Group the kept topics into Semantic Clusters.
            - Topics typically taught in the same 1-hour lecture should be clustered.
            - Distinct instrumentation or disparate physics concepts MUST be separated.
            
            **OUTPUT JSON:**
            {
                "lecture_worthy_topics": ["List of strings..."],
                "clusters": [
                    { "theme": "Cluster Name", "topics": ["Topic A", "Topic B"] }
                ]
            }
            `;
            const res = await model.generateContent(prompt);
            return JSON.parse(res.response.candidates[0].content.parts[0].text);
        });

        if (!lecture_worthy_topics || lecture_worthy_topics.length === 0) {
            await step.run("finalize-empty", async () => {
                 await supabaseAdmin.from('curation_jobs').update({ status: 'complete' }).eq('id', job_id);
            });
            return "No lecture-worthy topics found.";
        }

        // --- STEP 2: Generate Queries Per Cluster (Expanded) ---
        const searchQueries = await step.run("gen-cluster-queries", async () => {
            const model = await getVertexAIModel("gemini-2.5-flash", { responseMimeType: "application/json" });
            
            const prompt = `
            Context: Indian Student. Exam: "${examName}". Region: ${user_timezone}.
            **CLUSTERS:** ${JSON.stringify(clusters)}

            **TASK:** Generate 3 YouTube search queries for EACH cluster.
            1. **The "One Shot" Query:** Broad coverage (e.g. "UV-Vis Spectroscopy One Shot Hindi").
            2. **The "Deep Dive" Query:** Focus on the most complex/instrumental topic (e.g. "FTIR Instrumentation Working Hindi").
            3. **The "English/Hinglish" Query:** Specific keywords for high-quality Indian educators (e.g. "Spectroscopy JEE/NEET Physics Wallah/Unacademy").
            
            **OUTPUT JSON:** { "queries": ["query1", "query2", ...] } (Flattened list of all queries)
            `;
            
            const res = await model.generateContent(prompt);
            return JSON.parse(res.response.candidates[0].content.parts[0].text).queries;
        });

        // --- STEP 3: Massive Parallel Search (Container I/O) ---
        // We fetch candidates from ALL clusters into a single pool
        const candidates = await step.run("fetch-candidates", async () => {
            let allVideos = [];
            for (const q of searchQueries) {
                try {
                    // Call our own API route
                    const res = await fetch(INTERNAL_SCOUT_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'search', query: q })
                    });
                    
                    if (res.ok) {
                        const vids = await res.json();
                        allVideos.push(...vids);
                    }
                } catch (e) { console.error(`Search error for ${q}`, e); }
            }
            
            const unique = new Map();
            allVideos.forEach(v => unique.set(v.id, v));
            return Array.from(unique.values()).slice(0, 15);
        });

        if (candidates.length === 0) {
            await step.run("fail-job", async () => {
                await supabaseAdmin.from('curation_jobs').update({ status: 'error' }).eq('id', job_id);
            });
            return "No videos found.";
        }

        // --- STEP 4: Fetch Metadata & Audit ---
        // Fetch metadata
        const videoDetails = await step.run("fetch-metadata", async () => {
            const results = [];
            const CHUNK_SIZE = 5; // Batch size
            
            for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
                const chunk = candidates.slice(i, i + CHUNK_SIZE);
                const chunkResults = await Promise.all(chunk.map(async (video) => {
                    try {
                        const res = await fetch(INTERNAL_SCOUT_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'details', videoId: video.id })
                        });
                        return res.ok ? await res.json() : null;
                    } catch (e) { return null; }
                }));
                results.push(...chunkResults.filter(r => r !== null));
            }
            return results;
        });

        // Audit (Vertex AI)
        const auditedVideos = await step.run("audit-metadata-strict", async () => {
            const model = await getVertexAIModel("gemini-2.5-flash", { responseMimeType: "application/json" });
            
            const auditPromises = videoDetails.map(async (video) => {
                const prompt = `
                **ROLE:** Strict Academic Auditor.
                **TARGET EXAM:** "${examName}"
                **REQUIRED TOPICS:** ${JSON.stringify(lecture_worthy_topics)}
                **PREFERRED:** Hinglish/English (Indian Context).
                
                **VIDEO METADATA:**
                Title: "${video.title}"
                Channel: "${video.channel}"
                Duration: "${video.duration}"
                Desc: """${video.description.substring(0, 1000)}..."""
                Chapters: ${JSON.stringify(video.chapters || [])}

                **LOGIC:**
                1. **Language:** If "Hindi Medium" (Pure Hindi text) -> Score 0. If "Hinglish" -> Score High.
                2. **Relevance:** Does it actually teach the Required Topics?
                3. **Depth:** Is the duration sufficient? (e.g. 5 mins for "Instrumentation" is bad. 30 mins is good).

                **OUTPUT JSON:**
                { 
                    "covered_topics": ["Exact Topic String"], 
                    "relevance_score": (0-100),
                    "justification": "Why?"
                }
                `;
                
                try {
                    const res = await model.generateContent(prompt);
                    const data = JSON.parse(res.response.candidates[0].content.parts[0].text);
                    return {
                        id: video.id,
                        title: video.title,
                        channel: video.channel,
                        thumbnail: video.thumbnail,
                        covered_topics: data.covered_topics?.filter(t => lecture_worthy_topics.includes(t)) || [],
                        relevance_score: data.relevance_score || 0,
                        justification: data.justification
                    };
                } catch (e) { return null; }
            });
            return (await Promise.all(auditPromises)).filter(v => v !== null);
        });

        // --- STEP 5: Initial Set Cover Solver ---
        let finalPlaylist = solveSetCover(auditedVideos, lecture_worthy_topics);

        // --- STEP 6: The "Sniper" Backfill (Gap Analysis) ---
        const coveredSet = new Set(finalPlaylist.flatMap(v => v.covered_topics));
        const missingTopics = lecture_worthy_topics.filter(t => !coveredSet.has(t));

        if (missingTopics.length > 0) {
            const backfillVideos = await step.run("sniper-backfill", async () => {
                const model = await getVertexAIModel("gemini-2.5-flash", { responseMimeType: "application/json" });
                const backfillResults = [];

                // Process each missing topic individually
                for (const missingTopic of missingTopics) {
                    // 1. Generate ultra-specific query
                    const queryPrompt = `Generate 1 highly specific YouTube query to find a detailed lecture on: "${missingTopic}" for "${examName}" in Hindi/Hinglish. Output JSON: { "query": "string" }`;
                    const qRes = await model.generateContent(queryPrompt);
                    const query = JSON.parse(qRes.response.candidates[0].content.parts[0].text).query;

                    // 2. Fetch 5 candidates
                    let sniperCandidates = [];
                    try {
                        const sRes = await fetch(`${SCOUT_URL}/search`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ query: query })
                        });
                        if (sRes.ok) sniperCandidates = await sRes.json();
                    } catch(e) {}
                    
                    if (sniperCandidates.length === 0) continue;

                    // 3. Fetch Metadata & Audit (Mini Loop)
                    // We just pick the first valid one to save time/tokens
                    for (const candidate of sniperCandidates.slice(0, 3)) { // Check top 3
                         try {
                            const metaRes = await fetch(`${SCOUT_URL}/getVideoDetails`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ videoId: candidate.id })
                            });
                            if (!metaRes.ok) continue;
                            const meta = await metaRes.json();
                            
                            // Quick AI Check
                            const auditPrompt = `
                            Topic: "${missingTopic}"
                            Video: "${meta.title}" (${meta.duration})
                            Desc: "${meta.description.substring(0, 500)}"
                            Is this a good explanation?
                            JSON: { "is_good": boolean, "justification": "string" }
                            `;
                            const auditRes = await model.generateContent(auditPrompt);
                            const auditData = JSON.parse(auditRes.response.candidates[0].content.parts[0].text);
                            
                            if (auditData.is_good) {
                                backfillResults.push({
                                    id: meta.id,
                                    title: meta.title,
                                    channel: meta.channel,
                                    thumbnail: meta.thumbnail,
                                    covered_topics: [missingTopic], // Explicitly map to the missing topic
                                    relevance_score: 85, // Sniper hits are usually high relevance
                                    justification: auditData.justification
                                });
                                break; // Found one, move to next missing topic
                            }
                         } catch(e) {}
                    }
                }
                return backfillResults;
            });
            
            // Merge backfill into playlist
            finalPlaylist = [...finalPlaylist, ...backfillVideos];
        }

        // --- STEP 7: Final Save ---
        await step.run("save-results", async () => {
            let savedCount = 0;
            for (const video of finalPlaylist) {
                for (const topicText of video.covered_topics) {
                    const originalTopic = sub_topics_to_curate.find(t => t.text === topicText);
                    if (originalTopic) {
                        await supabaseAdmin.from('curated_lectures').upsert({
                            plan_topic_id: originalTopic.plan_topic_id,
                            sub_topic_text: topicText,
                            video_url: `https://www.youtube.com/watch?v=${video.id}`,
                            title: video.title,
                            channel_name: video.channel,
                            relevance_score: video.relevance_score,
                            justification: video.justification || "AI Curated.",
                        });
                        savedCount++;
                    }
                }
            }
            if (savedCount > 0) {
                 await supabaseAdmin.rpc('increment_completed_topics', { job_id_param: job_id, increment_value: savedCount });
            }
        });

        await step.run("finalize-job", async () => {
            await supabaseAdmin.from('curation_jobs').update({ status: 'complete' }).eq('id', job_id);
        });

        return { message: "Scout job complete.", videos_found: finalPlaylist.length };
    }
);


// --- AGENT 2: THE SCRIPTER ---
const scripterAgent = inngest.createFunction(
    { id: "illustrator-agent-scripter" },
    { event: "notes/illustration.requested" },
    async ({ event, step }) => {
        const { note_id, user_id } = event.data;

        const note = await step.run("fetch-raw-markdown-for-scripting", async () => {
            const { data, error } = await supabaseAdmin
                .from('generated_notes')
                .select('notes_markdown')
                .eq('id', note_id)
                .single();
            if (error) throw new Error(`DB Error fetching note ${note_id}: ${error.message}`);
            if (!data) throw new Error(`Note with ID ${note_id} not found.`);
            return data;
        });

        const rawMarkdown = note.notes_markdown;
        const placeholders = rawMarkdown.match(/```kalpad-illustration([\s\S]*?)```/g) || [];
        
        if (placeholders.length === 0) {
            return { message: `Note ${note_id} has no illustrations to process.` };
        }

        let updatedMarkdown = rawMarkdown;
        let svgJobsDispatched = 0;

        // Use a standard for...of loop for async operations inside
        for (const placeholder of placeholders) {
            const jsonString = placeholder.replace('```kalpad-illustration', '').replace('```', '');
            let placeholderData;
            try {
                placeholderData = JSON.parse(jsonString);
            } catch (e) {
                console.warn(`Skipping malformed illustration placeholder in note ${note_id}`);
                continue; // Skip this iteration if the JSON is invalid
            }

            if (placeholderData.engine === 'matplotlib') {
                // --- Step 1 (NEW): Generate Python Code ---
                // This step's job is to create the Python code for our Foundry service.
                const imageUrl = await step.run(`atomic-generate-and-render-plot-for-${placeholderData.description.slice(0, 20)}`, async () => {
         // We use a powerful model for code generation to ensure high quality.
                    const model = await getVertexAIModel("gemini-2.5-pro");
                    
                    const prompt = `
    You are an expert Python data scientist. Your sole task is to write a **complete, self-contained, and executable Python script** to generate a plot based on a natural language description.

    **Description:** "${placeholderData.description}"

    **EXECUTION ENVIRONMENT (UNBREAKABLE RULES):**
    - Your script will be executed with \`exec()\`.
    - A Matplotlib Figure object is pre-defined for you and available in the global scope as the variable \`fig\`.
    - An in-memory image buffer is available as the variable \`img_buffer\`.
    - You MUST perform your own imports.
    - You MUST define any constants you need.
    - You MUST conclude your script with a call to save the plot: \`fig.savefig(img_buffer, format='png', bbox_inches='tight')\`.

    **ALLOWED LIBRARIES:**
    You can import and use any of the following:
    - \`matplotlib.pyplot as plt\`
    - \`numpy as np\`
    - \`pandas as pd\`
    - \`seaborn as sns\`
    - \`scipy\`
    - \`sympy\`
    - \`mpmath\`

    **CRITICAL OUTPUT FORMAT:**
    - Your response MUST be ONLY the raw Python code. Do not wrap it in \`\`\`python or any other markdown.

    **GOOD EXAMPLE SCRIPT (for a description 'A simple sine wave'):**
    # 1. Import necessary libraries
    import numpy as np
    import matplotlib.pyplot as plt

    # 2. Create an axes object from the provided 'fig'
    ax = fig.add_subplot(111)

    # 3. Generate data and plot on the axes
    x = np.linspace(0, 2 * np.pi, 200)
    y = np.sin(x)
    ax.plot(x, y)

    # 4. Add styling and labels
    ax.set_title('Sine Wave')
    ax.set_xlabel('Angle [rad]')
    ax.set_ylabel('sin(x)')
    ax.grid(True)
    
    # 5. Save the final figure to the buffer (MANDATORY)
    fig.savefig(img_buffer, format='png', bbox_inches='tight')
`;

                const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        let rawResponse = result.response.candidates[0].content.parts[0].text.trim();
        const codeMatch = rawResponse.match(/```(?:python)?([\s\S]*?)```/);
        const pythonCode = codeMatch ? codeMatch[1].trim() : rawResponse;

        // --- 2. Call the Matplotlib Foundry Microservice (Renderer) ---
        const foundryUrl = process.env.MATPLOTLIB_FOUNDRY_URL;
        if (!foundryUrl) {
            throw new Error("MATPLOTLIB_FOUNDRY_URL is not set.");
        }

        const response = await fetch(`${foundryUrl}/plot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: pythonCode }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            // This throw is CRITICAL. It fails the step and triggers a full retry.
            throw new Error(`Matplotlib Foundry service failed: ${errorData.error || response.statusText}`);
        }

        // --- 3. Upload the resulting image ---
        const imageBlob = await response.blob();
        const storagePath = `generated-illustrations/${note_id}-matplotlib-${Date.now()}.png`;
        
        const { error: uploadError } = await supabaseAdmin.storage
            .from('generated-illustrations')
            .upload(storagePath, imageBlob, { contentType: 'image/png', upsert: true });

        if (uploadError) {
            throw new Error(`Supabase upload error for Matplotlib plot: ${uploadError.message}`);
        }
        
        const { data: { publicUrl } } = supabaseAdmin.storage.from('generated-illustrations').getPublicUrl(storagePath);
        return publicUrl;
    });

    // The rest of the logic remains the same
    updatedMarkdown = updatedMarkdown.replace(placeholder, `![${placeholderData.description}](${imageUrl})`);

 } else if (placeholderData.engine === 'mermaid' || placeholderData.engine === 'd2') {
                
                // --- ATOMIC GENERATION & RENDER LOOP ---
                // We combine generation and rendering into one step to allow for "Self-Healing"
                // If the renderer rejects the code, we ask the AI to fix it immediately.
                const imageUrl = await step.run(`atomic-heal-render-${placeholderData.engine}-${placeholderData.description.slice(0, 15)}`, async () => {
                    const model = await getVertexAIModel("gemini-2.5-flash");
                    const forgeUrl = process.env.MERMAID_FORGE_URL; // Assuming d2 uses same or similar service endpoint structure
                    if (!forgeUrl) throw new Error("MERMAID_FORGE_URL not set");

                    let lastError = null;
                    let lastCode = null;
                    let attempts = 0;
                    const MAX_ATTEMPTS = 3;

                    while (attempts < MAX_ATTEMPTS) {
                        try {
                            // 1. Generate Script
                            let prompt = `You are an expert script generator for Mermaid.js diagrams. Convert the natural language description into a valid, complete script. Respond ONLY with the raw script code.
            
                            Engine: mermaid       
                            Description: "${placeholderData.description}"

                            CRITICAL MERMAID SYNTAX RULES (UNBREAKABLE):
                            1.  Node Text: All text inside nodes MUST be enclosed in double quotes. Example: \`A["This is my text"]\`
                            2.  Escaping Characters: You MUST replace special characters like \`[\`, \`]\`, \`{\`, \`}\`, \`(\`, \`)\` inside node text with their HTML entity codes. Example: To show \`arr[j]\`, you must write \`"arr&lsqb;j&rsqb;"\`.
                            3.  Flowchart Declaration: Always start the script with \`graph TD;\`.
                            4.  Do not add comments, markdown, explanations, or any other text.
                            `;

                            if (lastError) {
                                prompt += `
                                \n\nPREVIOUS ATTEMPT FAILED.
                                Previous Code:
                                ${lastCode}
                                
                                Error Message from Renderer:
                                "${lastError}"
                                
                                TASK: Fix the syntax error based on the message above. Return ONLY the corrected code.
                                `;
                            }

                            const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
                            const rawText = result.response.candidates[0].content.parts[0].text;
                            
                            // Sanitize
                            const scriptMatch = rawText.match(/```(?:mermaid|d2)?([\s\S]*?)```/);
                            const script = scriptMatch ? scriptMatch[1].trim() : rawText.trim();
                            lastCode = script;

                            // 2. Attempt Render (Call Microservice)
                            // Note: Assuming your Forge service accepts { script: "..." } and returns SVG/PNG buffer
                            const renderRes = await fetch(`${forgeUrl}/render`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    script, 
                                    engine: placeholderData.engine // Pass engine if your service supports d2 switching
                                })
                            });

                            if (!renderRes.ok) {
                                const errText = await renderRes.text();
                                // Capture the error to feed back to AI
                                throw new Error(errText); 
                            }

                            // 3. Upload Result
                            const imageContent = await renderRes.text(); // SVG string or Buffer
                            const ext = placeholderData.engine === 'mermaid' ? '.svg' : '.png'; // Adjust based on your service output
                            const contentType = placeholderData.engine === 'mermaid' ? 'image/svg+xml' : 'image/png';
                            
                            const storagePath = `generated-illustrations/${note_id}-${placeholderData.engine}-${Date.now()}${ext}`;
                            const { error: uploadError } = await supabaseAdmin.storage
                                .from('generated-illustrations')
                                .upload(storagePath, imageContent, { contentType, upsert: true });

                            if (uploadError) throw new Error(`Upload Failed: ${uploadError.message}`);

                            const { data: { publicUrl } } = supabaseAdmin.storage.from('generated-illustrations').getPublicUrl(storagePath);
                            
                            return publicUrl; // Success! Break the loop.

                        } catch (e) {
                            console.warn(`Attempt ${attempts + 1} failed for ${placeholderData.engine}:`, e.message);
                            lastError = e.message;
                            attempts++;
                        }
                    }
                    
                    throw new Error(`Failed to render ${placeholderData.engine} diagram after ${MAX_ATTEMPTS} attempts. Last error: ${lastError}`);
                });

                // Replace placeholder with the successful image
                updatedMarkdown = updatedMarkdown.replace(placeholder, `![${placeholderData.description}](${imageUrl})`);
                svgJobsDispatched++;
            }
        }
        
        // Update the markdown in the database immediately with any completed matplotlib plots
        await step.run("update-markdown-with-plots", async () => {
            const { error } = await supabaseAdmin
                .from('generated_notes')
                .update({ notes_markdown: updatedMarkdown })
                .eq('id', note_id);
            if (error) throw new Error(`DB Error after processing plots for note ${note_id}: ${error.message}`);
        });

        return { message: `Scripting complete for note ${note_id}. Dispatched ${svgJobsDispatched} SVG render jobs.` };
    }
);

const svgRendererAgent = inngest.createFunction(
    { id: "illustrator-agent-svg-renderer", concurrency: 1 },
    { event: 'notes/svg.render.requested' },
    async ({ event, step }) => {
        const { note_id, user_id, description, placeholder_text } = event.data;

        const rawScript = await step.run(`generate-mermaid-script`, async () => {
        const model = await getVertexAIModel("gemini-2.5-flash");
        const prompt = `
            You are an expert script generator for Mermaid.js diagrams. Convert the natural language description into a valid, complete script. Respond ONLY with the raw script code.
            
            Engine: mermaid
            Description: "${description}"
            
            CRITICAL MERMAID SYNTAX RULES (UNBREAKABLE):
            1.  Node Text: All text inside nodes MUST be enclosed in double quotes. Example: \`A["This is my text"]\`
            2.  Escaping Characters: You MUST replace special characters like \`[\`, \`]\`, \`{\`, \`}\`, \`(\`, \`)\` inside node text with their HTML entity codes. Example: To show \`arr[j]\`, you must write \`"arr&lsqb;j&rsqb;"\`.
            3.  Flowchart Declaration: Always start the script with \`graph TD;\`.
            4.  Do not add comments, markdown, explanations, or any other text.
        `;
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });
            return result.response.candidates[0].content.parts[0].text.trim();
        });

        if (!rawScript) {
            throw new Error(`AI failed to generate a script.`);
        }

        // --- THIS IS THE DEFINITIVE FIX: SANITIZE THE AI OUTPUT ---
        const scriptMatch = rawScript.match(/```(?:mermaid)?([\s\S]*?)```/);
        const script = scriptMatch ? scriptMatch[1].trim() : rawScript.trim();
        
        if (!script) {
            throw new Error(`AI output was empty after sanitization.`);
        }
        // --- END OF FIX ---

        const imageUrl = await step.run('render-mermaid-via-microservice', async () => {
            const forgeUrl = process.env.MERMAID_FORGE_URL;
            if (!forgeUrl) {
                throw new Error("MERMAID_FORGE_URL environment variable is not set.");
            }

            const response = await fetch(`${forgeUrl}/render`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // We now send the sanitized 'script', not the 'rawScript'
                body: JSON.stringify({ script: script }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Mermaid Forge service failed: ${errorData.error || response.statusText}`);
            }

            // 2. The response body is the raw SVG content.
            const svgContent = await response.text();

            // 3. Upload the resulting SVG to Supabase Storage.
            const storagePath = `generated-illustrations/${note_id}-mermaid-${Date.now()}.svg`;
            
            const { error: uploadError } = await supabaseAdmin.storage
                .from('generated-illustrations')
                .upload(storagePath, svgContent, { contentType: 'image/svg+xml', upsert: true });

            if (uploadError) {
                throw new Error(`Supabase upload error: ${uploadError.message}`);
            }
            
            // 4. Return the public URL.
            const { data: { publicUrl } } = supabaseAdmin.storage.from('generated-illustrations').getPublicUrl(storagePath);
            return publicUrl;
        });

        if (!imageUrl) {
            throw new Error(`Failed to generate and upload image URL for ${engine}`);
        }

        // Step 3: Send the final completion event with all necessary data for the updater
        await step.sendEvent("dispatch-final-update", {
            name: 'notes/illustration.complete',
            data: {
                note_id,
                user_id,
                placeholder_text, // The original placeholder to be replaced
                image_url: imageUrl,
                description
            }
        });

        return { success: true, imageUrl };
    }
);

// --- AGENT 4: THE FINAL UPDATER (NEW) ---
const finalUpdaterAgent = inngest.createFunction(
    { id: "illustrator-agent-final-updater", concurrency: 1 },
    { event: "notes/illustration.complete" },
    async ({ event, step }) => {
        const { note_id, user_id, placeholder_text, image_url, description } = event.data;
        
        const currentNote = await step.run("fetch-note-for-final-update", async () => {
            const { data, error } = await supabaseAdmin.from('generated_notes').select('notes_markdown').eq('id', note_id).single();
            if (error) throw new Error(`DB Error fetching note for final update: ${error.message}`);
            return data;
        });

        const finalMarkdown = currentNote.notes_markdown.replace(placeholder_text, `![${description}](${image_url})`);

        await step.run("perform-final-update", async () => {
            const { error } = await supabaseAdmin.from('generated_notes').update({ notes_markdown: finalMarkdown }).eq('id', note_id);
            if (error) throw new Error(`DB Error on final update: ${error.message}`);
        });

        // The notification logic can live here now
        await step.run("broadcast-completion-to-user", async () => {
            const channel = supabaseAdmin.channel(`user-notifications:${user_id}`);
            await channel.send({ type: 'broadcast', event: 'illustration-complete', payload: { note_id } });
        });

        return { message: `Note ${note_id} successfully updated with illustration.` };
    }
);

// --- ANALYST AGENT (Version 5: Fallback Enabled) ---
const analystAgent = inngest.createFunction(
    { 
        id: "curie-analyst-agent", 
        name: "Research Analyst: PDF Processor",
        concurrency: 2,
        retries: 0 // No retries. If it fails, we want to know immediately.
    },
    { event: "research/paper.added" },
    async ({ event, step }) => {
        const { paper_id } = event.data;
        const CORTEX_URL = process.env.CORTEX_URL;

        if (!CORTEX_URL) throw new Error("CORTEX_URL is not set.");

        // 1. Update Status to 'Processing'
        await step.run("update-status-processing", async () => {
            await supabaseAdmin
                .from('research_papers')
                .update({ status: 'processing' })
                .eq('id', paper_id);
        });

        // 2. Fetch Metadata
        const paper = await step.run("fetch-metadata", async () => {
            const { data, error } = await supabaseAdmin
                .from('research_papers')
                .select('*')
                .eq('id', paper_id)
                .single();
            if (error) throw new Error(error.message);
            return data;
        });

        // 3. Acquire PDF Buffer (With Fallback Logic)
        const pdfResult = await step.run("acquire-pdf-buffer", async () => {
            try {
                // A. User Upload (Supabase) - TRUSTED SOURCE
                // If this exists, the user manually uploaded it, or we fetched it successfully before.
                if (paper.pdf_path) {
                    const { data, error } = await supabaseAdmin.storage
                        .from('study-materials')
                        .download(paper.pdf_path);
                    
                    if (error) throw new Error(`Storage Download Failed: ${error.message}`);
                    const buffer = await data.arrayBuffer();
                    return { success: true, buffer: Buffer.from(buffer).toString('base64') };
                } 
                
                // B. Open Access URL - HOSTILE SOURCE
                // Only try this if we don't have a local copy
                if (paper.source_url) {
                    let targetUrl = paper.source_url;

                    // ArXiv HTML -> PDF Fix
                    if (targetUrl.includes('arxiv.org/abs/')) {
                        targetUrl = targetUrl.replace('/abs/', '/pdf/');
                    }
                    if (targetUrl.includes('arxiv.org') && !targetUrl.endsWith('.pdf')) {
                        targetUrl += '.pdf';
                    }

                    console.log(`Attempting Download: ${targetUrl}`);

                    // Stealth Request
                    const response = await axios.get(targetUrl, {
                        responseType: 'arraybuffer',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                            'Referer': 'https://www.google.com/'
                        },
                        timeout: 15000 // 15s timeout
                    });

                    // Check for valid PDF content type
                    const contentType = response.headers['content-type'];
                    if (contentType && !contentType.includes('pdf') && !contentType.includes('octet-stream')) {
                        throw new Error(`Invalid Content-Type: ${contentType}. Likely a landing page.`);
                    }

                    return { success: true, buffer: Buffer.from(response.data).toString('base64') };
                }

                throw new Error("No source URL or Upload found.");

            } catch (error) {
                console.error("Download Error:", error.message);
                // Return failure object instead of throwing, so we can handle it in the next step
                return { success: false, error: error.message };
            }
        });

        // 3.5 HANDLE FAILURE (The Logic You Requested)
        if (!pdfResult.success) {
            await step.run("mark-as-upload-needed", async () => {
                await supabaseAdmin
                    .from('research_papers')
                    .update({ 
                        status: 'upload_needed', // <--- THE KEY CHANGE
                        analyst_output: { 
                            error: `Automatic access failed (${pdfResult.error}). Please upload the PDF manually.` 
                        } 
                    })
                    .eq('id', paper_id);
            });
            
            // Stop the function cleanly. 
            // The frontend will now see 'upload_needed' and show the Orange button.
            return { message: "Analysis paused. Waiting for user upload.", error: pdfResult.error };
        }

        // --- IF SUCCESSFUL, PROCEED TO CORTEX ---
        const pdfBuffer = Buffer.from(pdfResult.buffer, 'base64');

        // 4. Send to Cortex
        const markdown = await step.run("cortex-extraction", async () => {
            const formData = new FormData();
            const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
            formData.append('file', blob, 'paper.pdf');

            const response = await fetch(`${CORTEX_URL}/process`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error(`Cortex Error: ${await response.text()}`);
            const data = await response.json();
            return data.markdown;
        });

        // 5. Gemini Analysis
        const analysis = await step.run("gemini-analysis", async () => {
            const model = await getVertexAIModel("gemini-2.5-pro", { responseMimeType: "application/json" });
            const prompt = `
            You are an Expert Research Analyst. Analyze this academic paper.
            
            **TASK:** Extract the following into a strict JSON structure.
            1. **core_hypothesis**: What is the main claim or problem being solved? (2-3 sentences)
            2. **methodology**: How did they do it? (Bullet points)
            3. **key_findings**: What were the results? (Bullet points)
            4. **limitations**: What did the authors admit they didn't solve?
            5. **future_work**: What do they suggest for next steps?
            6. **research_gaps**: Based on the limitations, what is a specific, viable research direction for a new student?
            
            **INPUT TEXT (MARKDOWN):**
            ${markdown} 
            `;
            
            const result = await model.generateContent(prompt);
            return JSON.parse(result.response.candidates[0].content.parts[0].text);
        });

        // 6. Save Analysis
        await step.run("save-analysis", async () => {
            await supabaseAdmin
                .from('research_papers')
                .update({
                    full_text_markdown: markdown,
                    analyst_output: analysis,
                    status: 'analyzed'
                })
                .eq('id', paper_id);
        });

        // 7. Trigger Step 2: Vectorization
        await step.sendEvent("trigger-vectorizer", {
            name: "research/vectorization.requested",
            data: { paper_id, project_id: paper.project_id }
        });

        return { success: true };
    }
);


const vectorizerAgent = inngest.createFunction(
    { 
        id: "curie-vectorizer-agent", 
        name: "Research Vectorizer: Memory Maker",
        concurrency: 4 
    },
    { event: "research/vectorization.requested" },
    async ({ event, step }) => {
        const { paper_id, project_id } = event.data;

        // 1. Fetch Clean Markdown
        const paper = await step.run("fetch-markdown", async () => {
            const { data } = await supabaseAdmin
                .from('research_papers')
                .select('full_text_markdown')
                .eq('id', paper_id)
                .single();
            return data;
        });

        if (!paper.full_text_markdown) return { message: "No text to vectorize." };

        // 2. Smart Chunking (Sliding Window)
        const chunks = await step.run("chunk-text", async () => {
            const text = paper.full_text_markdown;
            const CHUNK_SIZE = 1000; // Characters approx
            const OVERLAP = 100;
            
            const chunks = [];
            for (let i = 0; i < text.length; i += (CHUNK_SIZE - OVERLAP)) {
                chunks.push(text.substring(i, i + CHUNK_SIZE));
            }
            return chunks;
        });

        // 3. Generate Embeddings (Batch Process)
        // Vertex AI limits batch size (usually 5-20 per call). We'll batch carefully.
        const BATCH_SIZE = 5; 
        
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            await step.run(`vectorize-batch-${i}`, async () => {
                const batch = chunks.slice(i, i + BATCH_SIZE);
                
                // Call our new utility
                const vectors = await generateEmbeddings(batch, 'RETRIEVAL_DOCUMENT');

                // Prepare DB Insert payload
                const rows = batch.map((chunk, idx) => ({
                    paper_id: paper_id,
                    content_chunk: chunk,
                    embedding: vectors[idx] // This is the [float, float...] array
                }));

                const { error } = await supabaseAdmin
                    .from('research_vectors')
                    .insert(rows);

                if (error) throw new Error(error.message);
            });
        }

        return { message: `Vectorized ${chunks.length} chunks.` };
    }
);

// --- FINAL STEP: REGISTER THE NEW FUNCTIONS ---
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        curationPipeline, 
        scripterAgent, 
        svgRendererAgent,
        finalUpdaterAgent,
        analystAgent,
        vectorizerAgent

    ],
});
