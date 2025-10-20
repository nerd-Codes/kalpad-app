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

import which from 'which'; 

const preferredLangs = ['en-IN', 'hi-IN', 'en-US'];

// Initialize Supabase Admin Client for server-side operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- The Main Curation Function ---
const curationPipeline = inngest.createFunction(
    { id: "lecture-scout-curriculum-assembler-v1", name: "Lecture Scout Curriculum Assembler", concurrency: 2 },
    { event: "lecture-scout/curation.requested" },
    async ({ event, step }) => {
        const { job_id, user_id, sub_topics_to_curate, all_todays_topics, user_timezone } = event.data;
        const scoutUrl = process.env.LECTURE_SCOUT_URL;
        if (!scoutUrl) throw new Error("LECTURE_SCOUT_URL is not configured.");

        await step.run("update-job-status-to-inprogress", async () => {
            await supabaseAdmin.from('curation_jobs').update({ status: 'in_progress' }).eq('id', job_id);
        });

        // --- AGENT 1: Broad Search Query Generation ---
        const searchQueries = await step.run("agent-1-generate-search-queries", async () => {
            const model = await getVertexAIModel("gemini-2.5-flash-lite", { responseMimeType: "application/json" });
            const prompt = `
                You are an expert Research Strategist for an AI-powered study platform. Your sole task is to generate a diverse and intelligent set of YouTube search queries to build a pool of high-quality lecture candidates.

                **CONTEXT:**
                - **Student's Topics for Today:**
                - ${sub_topics_to_curate.map(t => t.text).join('\n  - ')}
                - **Overall Daily Theme:** "${all_todays_topics.join(', ')}"
                - **User's Region (for context):** "${user_timezone}"

                **YOUR DIRECTIVE:**
                Generate a JSON array of 5 to 7 unique and high-quality search queries. The goal is to cast a wide but intelligent net. Your queries MUST include a mix of the following types:
                1.  **Broad Theme Queries:** Create 1-2 queries for the "Overall Daily Theme" to find comprehensive, long-form lectures (e.g., "Operating Systems full course lecture", "Introduction to Quantum Mechanics").
                2.  **Specific Sub-Topic Queries:** For each of the "Student's Topics for Today," create a precise query. Add clarifying keywords like "tutorial," "explained," "derivation," or "example problems."
                3.  **Regional/Contextual Queries:** Create 1-2 queries that incorporate regional context based on the user's location, if relevant (e.g., "GATE CSE Operating Systems lecture", "CBSE Class 12 Physics tutorial").
                4.  **Conceptual Queries:** Create 1-2 queries aimed at finding visual or intuitive explanations (e.g., "Heisenberg Uncertainty Principle explained visually").

                **CRITICAL JSON SCHEMA:**
                Your entire output MUST be a single, valid JSON object with one key: "queries".
                {
                "queries": [
                    "query 1",
                    "query 2",
                    "query 3",
                    "query 4",
                    "query 5"
                ]
                }
                `;
            const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
            const data = JSON.parse(result.response.candidates[0].content.parts[0].text);
            return data.queries;
        });

        // --- AGENT 2: Microservice Orchestrator (Search & Fetch Transcripts) ---
        const transcriptPool = await step.run("agent-2-fetch-video-pool", async () => {
            let allCandidates = new Map();
            for (const query of searchQueries) {
                const response = await fetch(`${scoutUrl}/search`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query }),
                });
                if (response.ok) {
                    const videos = await response.json();
                    videos.forEach(v => allCandidates.set(v.id, v));
                }
            }

            const uniqueVideos = Array.from(allCandidates.values());
            const transcriptResults = [];
            
            await Promise.all(uniqueVideos.slice(0, 10).map(async (video) => { // Process up to 10 unique videos
                try {
                    const response = await fetch(`${scoutUrl}/getTranscript`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ videoId: video.id }),
                    });
                    if (response.ok) {
                        const { full_transcript } = await response.json();
                        if (full_transcript) transcriptResults.push({ ...video, full_transcript });
                    }
                } catch (e) { console.warn(`Skipping transcript for ${video.id}:`, e.message); }
            }));
            return transcriptResults;
        });

        if (transcriptPool.length === 0) {
            await step.run("update-job-status-to-error-no-videos", async () => {
                await supabaseAdmin.from('curation_jobs').update({ status: 'error' }).eq('id', job_id);
            });
            return { message: "Failed: No videos with transcripts were found to analyze." };
        }

        // --- AGENT 3: Transcript Indexer AI ---
        const indexedVideos = await step.run("agent-3-index-transcripts", async () => {
            const model = await getVertexAIModel("gemini-2.5-flash", { responseMimeType: "application/json" });
            const userTopics = sub_topics_to_curate.map(t => t.text);
            
            const indexingPromises = transcriptPool.map(video => {
                const prompt = `
                    You are an AI Academic Indexer. Your task is to analyze a video transcript and act as a strict, intelligent filter. You will determine which of a user's specific study topics are covered in the video, how well they are covered, and provide a concise summary of the explanation.

                    **CONTEXT:**
                    - **User's Full List of Topics for Today:**
                    ${JSON.stringify(userTopics)}
                    - **Video Title:** "${video.title}"

                    **SOURCE MATERIAL:**
                    - **Video Transcript (first 25,000 characters):**
                    """
                    ${video.full_transcript.substring(0, 25000)}...
                    """

                    **YOUR TASK (Execute with precision):**
                    1.  Read the user's full list of topics.
                    2.  Read the video transcript and title.
                    3.  For EACH topic in the user's list, determine if it is substantively discussed in the transcript.
                    4.  If a topic is discussed, you MUST generate an object for it in the output array. If it is NOT discussed, you MUST NOT include it in the output.

                    **CRITICAL JSON SCHEMA:**
                    Your entire output MUST be a single, valid JSON object with one key: "topic_analysis". This key must be an array of objects.
                    For each topic found in the transcript, the object MUST contain:
                    - **"topic_name":** The exact string of the topic from the user's list.
                    - **"relevance_score":** An integer from 1 to 100.
                        - (90-100): A deep, thorough explanation with examples. The core focus of the video.
                        - (70-89): A solid, clear explanation, but perhaps not the main focus.
                        - (50-69): The topic is mentioned and explained, but briefly or at a surface level.
                        - (<50): The topic is only mentioned in passing; do NOT include it in the output.
                    - **"summary":** A single, concise sentence summarizing the video's explanation of THAT specific topic (e.g., "The video explains the photoelectric effect by detailing Einstein's equation and the concept of light quanta.").

                    **EXAMPLE OUTPUT:**
                    {
                    "topic_analysis": [
                        {
                        "topic_name": "The Photoelectric Effect",
                        "relevance_score": 95,
                        "summary": "The video provides a detailed derivation of Einstein's photoelectric equation and uses an animated experiment to explain the concept of work function."
                        },
                        {
                        "topic_name": "Wave-Particle Duality",
                        "relevance_score": 75,
                        "summary": "The transcript discusses wave-particle duality as the foundational context for the photoelectric effect but doesn't cover other experiments like electron diffraction."
                        }
                    ]
                    }
                    `;
                return model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
                    .then(result => {
                        const analysis = JSON.parse(result.response.candidates[0].content.parts[0].text);
                        return { id: video.id, title: video.title, channel: video.channel, topic_analysis: analysis.topic_analysis || [] };
                    })
                    .catch(e => ({ id: video.id, title: video.title, channel: video.channel, topic_analysis: [] }));
            });
            return Promise.all(indexingPromises);
        });

        // --- AGENT 4: Master Curator AI ---
        const finalCuration = await step.run("agent-4-master-curator", async () => {
            const model = await getVertexAIModel("gemini-2.5-flash-lite", { responseMimeType: "application/json" });
            const userTopics = sub_topics_to_curate.map(t => t.text);
            const prompt = `
                You are a Master Curator AI, an expert in pedagogy and information design. Your task is to assemble the perfect, most efficient video playlist for a student's study session from a pre-analyzed pool of candidates.

                **CONTEXT:**
                - **Student's Full List of Topics for Today:**
                ${JSON.stringify(userTopics)}

                - **Available Video Candidates and Their Indexed Topic Coverage:**
                ${JSON.stringify(indexedVideos.map(v => ({ id: v.id, title: v.title, channel: v.channel, topic_analysis: v.topic_analysis })))}

                **YOUR DIRECTIVE (This is a combinatorial optimization problem):**
                Select the OPTIMAL and SMALLEST set of videos to achieve the highest quality coverage across all of the student's topics.

                **YOUR UNBREAKABLE RULES OF CURATION:**
                1.  **Prioritize "Power Videos":** A single video that covers multiple topics with a high score (e.g., >80) is DRAMATICALLY more valuable than multiple separate videos. Your primary goal is to find these long-form, comprehensive lectures.
                2.  **Maximize Total Score:** The final combination of videos you select should aim to maximize the sum of the 'relevance_score' for all of the user's topics.
                3.  **Avoid Redundancy:** Do not select two different videos to explain the same topic unless they both have exceptionally high scores (>90) and clearly offer different perspectives (e.g., one is a theoretical lecture, the other is a problem-solving session).
                4.  **Be Ruthless:** If a topic is only covered with a low score (<60) by all available videos, do not hesitate to omit it. It is better to recommend nothing than to recommend a poor-quality resource.

                **CRITICAL JSON OUTPUT SCHEMA:**
                Your entire output MUST be a single, valid JSON array. Each object in the array represents a video you have selected. The object MUST contain:
                - **"id":** The video's unique ID.
                - **"title":** The video's title.
                - **"channel":** The video's channel name.
                - **"relevance_score":** The AVERAGE relevance score for the topics this video covers from the user's list.
                - **"relevant_topics":** A JSON array of strings, listing the EXACT topic names from the user's list that this video should be watched for.

                **EXAMPLE OUTPUT:**
                [
                {
                    "id": "abc-123",
                    "title": "Quantum Mechanics Full Chapter Lecture (MIT)",
                    "channel": "MIT OpenCourseWare",
                    "relevance_score": 92,
                    "relevant_topics": [
                    "The Photoelectric Effect",
                    "Wave-Particle Duality",
                    "Heisenberg Uncertainty Principle"
                    ]
                },
                {
                    "id": "def-456",
                    "title": "Practice Problems: The Photoelectric Effect",
                    "channel": "Physics-is-Fun",
                    "relevance_score": 95,
                    "relevant_topics": [
                    "The Photoelectric Effect"
                    ]
                }
                ]
                `;
            const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
            return JSON.parse(result.response.candidates[0].content.parts[0].text);
        });
        
        // --- AGENT 5: Final Save Loop ---
        await step.run("agent-5-save-curation", async () => {
            let topicsCompletedInJob = 0;
            for (const finalVideo of finalCuration) {
                if (!finalVideo.relevant_topics) continue;
                for (const topicName of finalVideo.relevant_topics) {
                    const subTopicData = sub_topics_to_curate.find(st => st.text === topicName);
                    if (subTopicData) {
                        const { error } = await supabaseAdmin.from('curated_lectures').upsert({
                            plan_topic_id: subTopicData.plan_topic_id,
                            sub_topic_text: topicName,
                            video_url: `https://www.youtube.com/watch?v=${finalVideo.id}`,
                            title: finalVideo.title,
                            channel_name: finalVideo.channel,
                            relevance_score: 100, // Score from the curator is the new truth
                            justification: `Covers topic: ${topicName}`,
                        });
                        if (error) console.error(`DB Upsert Error for ${topicName}:`, error.message);
                        else topicsCompletedInJob++;
                    }
                }
            }
            // Update progress in a single call at the end
            await supabaseAdmin.rpc('increment_completed_topics', { job_id_param: job_id, increment_value: topicsCompletedInJob });
        });

        await step.run("update-job-status-to-complete", async () => {
            await supabaseAdmin.from('curation_jobs').update({ status: 'complete' }).eq('id', job_id);
        });

        return { message: `Lecture Scout v3 job ${job_id} completed successfully.` };
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

} else if (placeholderData.engine === 'mermaid') {
                await step.sendEvent("dispatch-svg-render-job", {
                    name: 'notes/svg.render.requested',
                    data: {
                        note_id,
                        user_id,
                        engine: 'mermaid',
                        description: placeholderData.description,
                        placeholder_text: placeholder
                    }
                });
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

// --- FINAL STEP: REGISTER THE NEW FUNCTIONS ---
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        curationPipeline, 
        scripterAgent, 
        svgRendererAgent,
        finalUpdaterAgent

    ],
});
