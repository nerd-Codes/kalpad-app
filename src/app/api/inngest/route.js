// src/app/api/inngest/route.js

import { inngest } from "@/lib/inngest";
import { serve } from "inngest/next";
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Innertube } from 'youtubei.js';
import fetch from 'node-fetch';

const preferredLangs = ['en-IN', 'hi-IN', 'en-US'];

// Initialize Supabase Admin Client for server-side operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function selectBestCaption(captionTracks) {
    for (const lang of preferredLangs) {
        const track = captionTracks.find(ct => ct.languageCode === lang);
        if (track) return track.baseUrl;
    }
    // Fallback: pick first available
    return captionTracks.length > 0 ? captionTracks[0].baseUrl : null;
}

export async function getTranscript(videoId) {
    try {
        // Step 1: Create an Innertube client — start with top preference
        const youtube = await Innertube.create({
            lang: preferredLangs[0].split('-')[0], // 'en'
            location: 'IN',
            retrieve_player: false
        });

        // Step 2: Get video info
        const info = await youtube.getInfo(videoId);

        // Step 3a: Try the built-in transcript method first
        const transcriptData = await info.getTranscript();

        // youtubei.js already returns best available, but if you 
        // want manual selection for more control:
        if (transcriptData?.transcript?.content?.body?.initial_segments) {
            return transcriptData.transcript.content.body.initial_segments
                .map(segment => segment.snippet.text)
                .join(' ');
        }

        // Step 3b: If transcript not found, manually check caption track list
        const captions = info.captions?.caption_tracks;
        if (captions?.length) {
            const bestTrackUrl = selectBestCaption(captions);
            if (bestTrackUrl) {
                const res = await fetch(bestTrackUrl + '&fmt=json3');
                const json = await res.json();
                return json.events
                    ?.filter(event => event.segs)
                    ?.map(event => event.segs.map(seg => seg.utf8).join(' '))
                    ?.join(' ') || null;
            }
        }

        console.warn(`[Transcript] No transcript available for ${videoId}`);
        return null;

    } catch (error) {
        console.error(`[Transcript] Failed to fetch transcript for ${videoId}:`, error.message);
        return null;
    }
}

// --- The Main Curation Function ---
const curationPipeline = inngest.createFunction(
    { id: "lecture-scout-pipeline", concurrency: { limit: 5 } },
    { event: "lecture-scout/curation.requested" },
    async ({ event, step }) => {
        const { job_id, user_id, sub_topics_to_curate, cohesion_context, user_timezone } = event.data;

        await step.run("update-job-status-to-inprogress", async () => {
            await supabaseAdmin
                .from('curation_jobs')
                .update({ status: 'in_progress' })
                .eq('id', job_id);
        });

        let allVerifiedVideos = []; // This will hold results for the final cohesion step

        const topicProcessingPromises = sub_topics_to_curate.map(async (subTopic) => {
            try {
                // AGENT 0.5: The Topic Distiller
                const cleanTopic = await step.run(`agent-0.5-distill-topic-${subTopic.text.slice(0, 15)}`, async () => {
                    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                    const prompt = `You are a Topic Distiller. Your one job is to read the following instructional text and extract the core, searchable academic concept.
                        Context: 
                        The overall exam is "${subTopic.exam_name}".    
                        Instructional Text: "${subTopic.text}"
                        CRITICAL: Respond with ONLY the clean, concise topic name. Do not add any other words.
                        Example Input: "Biology: Introduction to Life Processes and Autotrophic Nutrition. Grasp the fundamental concept of 'Life Processes'..."
                        Example Output: "Autotrophic Nutrition and Photosynthesis"`;
                    const result = await model.generateContent(prompt);
                    return result.response.text().trim();
                });
                
                const stepIdSuffix = `-${cleanTopic.slice(0, 25).replace(/\s/g, '_')}`;

                // AGENT 0: The Librarian (Cache Check)
                const cacheHit = await step.run(`agent-0-cache-check${stepIdSuffix}`, async () => {
                    const { embedding } = await genAI.getGenerativeModel({ model: "text-embedding-004" }).embedContent(cleanTopic);
                    const { data: matches, error } = await supabaseAdmin.rpc('match_lectures', {
                        query_embedding: embedding.values, match_threshold: 0.95, match_count: 1
                    });
                    if (error || !matches || !matches.length) return null;
                    return matches[0];
                });

                if (cacheHit) {
                    await step.run(`record-cache-hit${stepIdSuffix}`, async () => {
                         const { error } = await supabaseAdmin.from('curated_lectures').upsert({
                            plan_topic_id: subTopic.plan_topic_id, sub_topic_text: subTopic.text,
                            video_url: cacheHit.video_url, title: cacheHit.title, channel_name: cacheHit.channel_name,
                            relevance_score: 100, justification: "High-confidence match from existing knowledge base.", embedding: cacheHit.embedding
                        });
                        if (error) throw new Error(`DB Upsert Error (Cache Hit): ${error.message}`);
                    });
                    console.log(`[Job ${job_id}] Cache HIT for: "${subTopic.text}"`);
                } else {
                    console.log(`[Job ${job_id}] Cache MISS for: "${cleanTopic}". Starting full pipeline...`);
                    
                    // AGENT 1: The Research Strategist
                    const searchKeywords = await step.run(`agent-1-generate-keywords${stepIdSuffix}`, async () => {
                        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
                        const prompt = `You are an expert Research Strategist for an AI study platform. Your sole task is to generate a diverse set of expert-level YouTube search queries for a specific academic topic.
                            Context:
                            - Overall Exam Name: "${subTopic.exam_name}"
                            - Today's Main Topic: "${subTopic.day_topic}"
                            - Distilled Sub-Topic: "${cleanTopic}"
                            - User Region: "${user_timezone}"

                            Your Instructions:
                        1.  Generate 3 distinct search queries.
                        2.  Queries should range from foundational (e.g., "introduction to X") to specific (e.g., "solving Y type problems") to conceptual (e.g., "visual explanation of Z").
                        3.  Do NOT simply repeat the sub-topic name. Add keywords like "tutorial," "explained," "example," "lecture," "for beginners," or relevant technical terms.
                        4. The user is in the '${user_timezone}' region. Prioritize search queries that include regional context, such as 'for CBSE Class 10' or 'in Hindi'.
                        CRITICAL JSON SCHEMA (Return ONLY a valid JSON array of strings):
                        ["query 1", "query 2", "query 3"]`;
                        const result = await model.generateContent(prompt);
                        return JSON.parse(result.response.text());
                    });

                    // AGENT 2: The Search & Filter Drone
                    const videoCandidates = await step.run(`agent-2-search-youtube${stepIdSuffix}`, async () => {
                        const yt = await Innertube.create();
                        const searchResults = await yt.search(searchKeywords[0], { sort_by: 'relevance' });
                        return searchResults.videos
                            .filter(v => v.duration && v.duration.seconds > 180 && v.duration.seconds < 5400)
                            .slice(0, 3).map(v => ({ id: v.id, title: v.title?.text, channel: v.author?.name }));
                    });

                    // AGENT 3: The Verification Analyst
                    let verifiedVideosForTopic = [];
                    for (const candidate of videoCandidates) {
                        const fullTranscript = await step.run(`get-full-transcript-for-${candidate.id}`, () => getTranscript(candidate.id));
                        if (fullTranscript) {
                        // Step 2 (NEW): Run the "Smart Snippet" Agent to extract the golden passage
                        const smartSnippet = await step.run(`agent-3.5-get-snippet-for-${candidate.id}`, async () => {
                            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Using the fast, low-cost model
                            const prompt = `You are an AI pre-processor. Your sole function is to analyze a raw video transcript and extract the single most academically relevant and information-dense passage related to a specific topic. Aggressively ignore all filler, introductions, and promotions.
                                - Overall Exam Name: "${subTopic.exam_name}"
                                - Target Academic Topic: "${cleanTopic}"

                                Full Video Transcript:
                                """
                                ${fullTranscript}
                                """

                                Your Task: Read the transcript, identify the core educational segment for the topic, and extract a single, contiguous block of text approximately 1000 words long. Return ONLY the raw text of this passage.`;
                            
                            const result = await model.generateContent(prompt);
                            return result.response.text().trim();
                        });

                        if (smartSnippet) {
                            const analysis = await step.run(`agent-3-verify-${candidate.id}`, async () => {
                                 const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
                                 const prompt = `You are a meticulous Verification Analyst for an AI study platform. Your task is to act as a strict quality gate. Analyze the provided "smart snippet" to determine if it is a high-quality, relevant educational resource for the given sub-topic.
                                    - Overall Exam Name: "${subTopic.exam_name}"
                                    - Specific Sub-Topic: "${subTopic.sub_topic_text}"
                                    **Curated Smart Snippet:**
                                    """
                                    ${smartSnippet}
                                    """
                                    Your Instructions:
                                    1.  Read the smart snippet and assess its relevance to the specific sub-topic.
                                    2.  Evaluate the quality: Is the language clear? Is it a tutorial/lecture or just a discussion? Is it too basic or too advanced?
                                    3.  Based on your analysis, provide a relevance score from 1 to 100.
                                    4.  Provide a concise, one-sentence justification for your score.
                                    CRITICAL: A video is high quality if the accent and context are appropriate for a user in '${user_timezone}'. A video in Hindi or with an Indian accent is strongly preferred. Penalize the score for heavy Western accents.
                                    CRITICAL JSON SCHEMA (Return ONLY a single, valid JSON object):
                                    { "relevance_score": number, "justification": "A one-sentence explanation of your reasoning." }`;
                                 const result = await model.generateContent(prompt);
                                 return JSON.parse(result.response.text());
                            });

                            if (analysis && analysis.relevance_score > 60) {
                                verifiedVideosForTopic.push({ ...candidate, ...analysis, subTopicText: subTopic.text });
                            }
                        }
                    }
                    
                    }
                    // Add this topic's verified results to the master list for the final cohesion step
                    allVerifiedVideos.push(...verifiedVideosForTopic);
                }
            } catch (error) {
                console.error(`[Job ${job_id}] FAILED to process sub-topic "${subTopic.text}":`, error);
            }
        });

        await Promise.all(topicProcessingPromises);

        // --- AGENT 5: The Cohesion Agent (Meta-Analysis) ---
        const finalCuration = await step.run("agent-5-cohesion-and-curation", async () => {
            if (allVerifiedVideos.length === 0) return [];
            
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
            const prompt = `You are a master Curation Agent. Select the single best YouTube video for each sub-topic from a list of verified candidates. Prioritize cohesion.
                Today's Full Learning Context: ${cohesion_context.join(', ')}
                Verified Video Candidates (JSON): ${JSON.stringify(allVerifiedVideos)}
                Instructions:
                1. Review all candidates.
                2. For each unique sub-topic, select the single BEST video.
                3. Cohesion Rule: If multiple candidates for different topics are from the same highly-rated channel, STRONGLY prefer selecting them to create a consistent learning experience.
                CRITICAL JSON SCHEMA: Return an array of objects: [{ "subTopicText": "...", "id": "...", "title": "...", "channel": "...", "relevance_score": ... }]`;
            const result = await model.generateContent(prompt);
            return JSON.parse(result.response.text());
        });

        // --- FINAL STEP: Index and Save ONLY the final, cohesive selections ---
        for (const finalVideo of finalCuration) {
            const subTopicData = sub_topics_to_curate.find(st => st.text === finalVideo.subTopicText);
            if (subTopicData) {
                 await step.run(`final-save-${finalVideo.id}`, async () => {
                    const contentToIndex = `Title: ${finalVideo.title}\nChannel: ${finalVideo.channel}`;
                    const { embedding } = await genAI.getGenerativeModel({ model: "text-embedding-004" }).embedContent(contentToIndex);
                    const { data: insertedData, error } = await supabaseAdmin.from('curated_lectures').upsert({
                        plan_topic_id: subTopicData.plan_topic_id, sub_topic_text: finalVideo.subTopicText,
                        video_url: `https://www.youtube.com/watch?v=${finalVideo.id}`, title: finalVideo.title, channel_name: finalVideo.channel,
                        relevance_score: finalVideo.relevance_score, justification: "Selected by Cohesion Agent.", embedding: embedding.values,
                    }).select().single();
                    if (error) { throw new Error(`DB Upsert Error: ${error.message}`); }
                    if (!insertedData) { throw new Error("Upsert returned no data."); }
                    console.log(`[Job ${job_id}] Cohesion Agent SAVED lecture for: "${finalVideo.subTopicText}"`);
                 });
            }
            await step.run(`final-update-progress-for-${finalVideo.id}`, async () => {
                await supabaseAdmin.rpc('increment_completed_topics', { job_id_param: job_id });
            });
        }

        await step.run("update-job-status-to-complete", async () => {
            await supabaseAdmin.from('curation_jobs').update({ status: 'complete' }).eq('id', job_id);
        });

        return { message: `Curation job ${job_id} completed.` };
    }
);

export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [curationPipeline],
});