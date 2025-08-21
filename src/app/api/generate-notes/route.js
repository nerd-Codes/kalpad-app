// src/app/api/generate-notes/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { inngest } from '@/lib/inngest';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    let supabase;
    let session;

    // --- AUTHENTICATION ---
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const jwt = authHeader.replace('Bearer ', '');
        supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            { global: { headers: { Authorization: `Bearer ${jwt}` } } }
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (user) { session = { user }; }
    } else {
        supabase = createRouteHandlerClient({ cookies });
        const { data } = await supabase.auth.getSession();
        session = data.session;
    }

    if (!session) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { plan_topic_id, sub_topic_text, exam_name, day_topic } = await request.json();
    
    // --- CONTEXT RETRIEVAL (RAG) ---
    const { data: topicData, error: topicError } = await supabase
      .from('plan_topics').select('relevant_page_images').eq('id', plan_topic_id).single();
      
    if (topicError) {
      throw new Error(`Failed to fetch topic images: ${topicError.message}`);
    }

    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const embeddingResult = await embeddingModel.embedContent(sub_topic_text);
    const { data: matches } = await supabase.rpc('match_documents', {
        query_embedding: embeddingResult.embedding.values,
        match_threshold: 0.73,
        match_count: 5,
        target_user_id: session.user.id
    });
    const retrievedTextContext = matches?.map(m => m.content).join('\n---\n') || "No specific text context found.";

    const imageParts = [];
    if (topicData.relevant_page_images && topicData.relevant_page_images.length > 0) {
        for (const imageUrl of topicData.relevant_page_images) {
            const path = imageUrl.substring(imageUrl.indexOf('/study-materials/') + '/study-materials/'.length);
            const { data: imageBlob, error: downloadError } = await supabase.storage.from('study-materials').download(path);
            if (downloadError) { console.error(`Skipping image due to download error:`, downloadError.message); continue; }
            const buffer = await imageBlob.arrayBuffer();
            imageParts.push({ inlineData: { data: Buffer.from(buffer).toString("base64"), mimeType: 'image/jpeg' } });
        }
    }
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // --- ARCHITECTURAL UPGRADE: THE VALIDATED TWO-SHOT CHAIN ---

    // --- STAGE 1: THE OUTLINER AGENT ---
    const outlinePrompt = `
      You are an academic author creating an outline for a study chapter. Be precise and logical.
      
      **Full Context:**
      - Exam: "${exam_name}"
      - Main Chapter Topic: "${day_topic}"
      - Specific Sub-Topic for this Outline: "${sub_topic_text}"
      
      Reference Material: Provided as multimodal input (text and images).
      
      Based on ALL of this context, create a detailed, structured outline for a comprehensive chapter on the specific sub-topic. Output ONLY the outline.`;
    const outlineResult = await model.generateContent([outlinePrompt, ...imageParts]);
    const chapterOutline = outlineResult.response.text();

    // --- STAGE 2: THE VALIDATION GATE ---
    if (!chapterOutline || chapterOutline.trim().length < 50) {
      throw new Error("The AI could not build a valid outline for this topic. It may be too abstract or lack sufficient context in your documents. Please try rephrasing.");
    }

    // --- STAGE 3: THE AUTHOR AGENT ---
     const authorPrompt = `
      You are an expert academic author. Your task is to write a comprehensive, self-contained study chapter.
      
      **Full Context:**
      - Exam: "${exam_name}"
      - Main Chapter Topic: "${day_topic}"
      - Specific Sub-Topic to Write About: "${sub_topic_text}"
      
      **Chapter Outline You MUST Follow Exactly:**
      ---
      ${chapterOutline}
      ---
      
      Reference Material & Images: Provided as multimodal input.
      
      **CRITICAL INSTRUCTIONS:**
      1.  Write the full chapter by meticulously following the provided outline. Do not deviate.
      2.  Format the output in beautiful, clean Markdown.
      3.  Use LaTeX for all mathematical equations. Use single dollar signs ($...$) for inline math and double dollar signs ($$...$$) for block-level math.
      4.  Conclude the chapter with a "Key Takeaways" summary section.
      5.  **UNBREAKABLE RULE: No Redundant Titles.** The user is already seeing the "Main Chapter Topic" and the "Specific Sub-Topic" in the application's UI. Your response must NOT repeat them as a title or subtitle. Begin the note directly with the first point of the outline (e.g., start with "### I. Introduction to...").

      **LATEX STYLE GUIDE (UNBREAKABLE RULES FOR KATEX COMPATIBILITY):**
      - **For Matrices:** NEVER use the \`\\begin{vmatrix}\` environment. ALWAYS use the capitalized version: \`\\begin{Vmatrix}\` ... \`\\end{Vmatrix}\`. This is a non-negotiable compatibility requirement.
      - **Special Characters:** Inside any math block, you MUST escape standalone percentage signs like this: \`\\%\`.
      - **Clarity:** Ensure all brackets and delimiters are correctly matched (e.g., \`\\left( ... \\right)\`).
    
     **ILLUSTRATION MANDATE (WITH COMPLEXITY BUDGET):**
      When a visual plot is critical for explaining a core concept, you MUST insert an 'Illustration Placeholder'.
      - **Budget:** You have a very low budget of illustrations per note. Use them only for the most important visual concepts. Do not generate multiple plots for slight variations of the same function.
      - **Placement:** Insert the placeholder immediately after the paragraph that explains the concept the plot will illustrate.
      - **Supported Engines:** 'matplotlib' for plots, 'd2' for diagrams, 'mermaid' for flowcharts.
      
      Example for a Plot:
      \`\`\`kalpad-illustration
      {
        "engine": "matplotlib",
        "description": "A plot of y = sin(x) from 0 to 2*pi, demonstrating one full period of a sine wave."
      }
      \`\`\`

      Example for a Diagram (d2):
      \`\`\`kalpad-illustration
      {
        "engine": "d2",
        "description": "A diagram showing a central server connected to two clients, client1 and client2."
      }
      \`\`\`

      Example for a Flowchart (mermaid):
      \`\`\`kalpad-illustration
      {
        "engine": "mermaid",
        "description": "A simple flowchart that starts at A, goes to a process B, and ends at C."
      }
      \`\`\`
      `;

    const authorResult = await model.generateContent([authorPrompt, ...imageParts]);
    const notesText = authorResult.response.text();

    // --- STAGE 4: FINAL CONTENT VALIDATION ---
    if (!notesText || notesText.trim().length < 50) {
        throw new Error("The AI failed to generate a sufficiently detailed note from the outline. Please try again.");
    }
    
    // --- DATABASE WRITE ---
    const { data: savedNote, error: saveError } = await supabase
      .from('generated_notes')
      .upsert({
        user_id: session.user.id,
        plan_topic_id: plan_topic_id,
        sub_topic_text: sub_topic_text,
        notes_markdown: notesText,
      }, { onConflict: 'plan_topic_id, sub_topic_text' })
      .select()
      .single();

    if (saveError) {
      throw new Error(`Failed to save note: ${saveError.message}`);
    }

    if (notesText.includes('kalpad-illustration')) {
      await inngest.send({
        name: 'notes/illustration.requested',
        data: {
          note_id: savedNote.id,
          user_id: session.user.id
        }
      });
    }

    return new Response(JSON.stringify({ note: savedNote }), { status: 200 });

  } catch (error) {
    console.error('Full error in generate-notes API:', error);
    return new Response(JSON.stringify({ error: error.message || 'An internal error occurred.' }), { status: 500 });
  }
}