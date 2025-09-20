// src/app/api/generate-notes/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { inngest } from '@/lib/inngest';
import { getVertexAIModel } from '@/lib/vertexai'; 

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
    
    const model = await getVertexAIModel('gemini-2.5-flash');

    // --- ARCHITECTURAL UPGRADE: THE VALIDATED TWO-SHOT CHAIN ---

    // --- STAGE 1: THE OUTLINER AGENT ---
    const outlinePrompt = `
      You are an expert curriculum designer and master educator. Your task is to create the perfect skeleton—a detailed, pedagogical outline—for a self-contained study chapter. Your #1 priority is creating a logical flow that is perfectly tailored to the student's level.
      
      **Full Context:**
      - Exam: "${exam_name}"
      - Main Chapter Topic: "${day_topic}"
      - Specific Sub-Topic for this Outline: "${sub_topic_text}"
      
      Reference Material: Provided as multimodal input (text and images).
      
      **UNBREAKABLE RULE: AUDIENCE AWARENESS IS CRITICAL.** The "Exam" context is your primary guide. An outline for "Class 10th Boards" must be simpler and more focused on fundamentals than an outline for "UPSC Mains" or "GATE Electronics". You MUST adjust the depth and complexity of the outline sections accordingly.
      
      **TASK:**
      Based on ALL the provided context, create a detailed, structured outline for a comprehensive chapter on the specific sub-topic. 
      
      A good outline often includes:
      - A brief introduction to the concept.
      - A breakdown of the core principles or components.
      - A section for key formulas or derivations (if applicable).
      - A section for practical examples or applications.
      - A concluding summary.
      
      **OUTPUT FORMAT:**
      Output ONLY a structured Markdown outline (using ### for sections). This outline will be given to another AI to write the full chapter, so its clarity and logical flow are paramount.
      `;
    const outlineResult = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: outlinePrompt }, ...imageParts] }]
    });
    const chapterOutline = outlineResult.response.candidates[0].content.parts[0].text;

    // --- STAGE 2: THE VALIDATION GATE (Unchanged) ---
    if (!chapterOutline || chapterOutline.trim().length < 50) {
      throw new Error("The AI could not build a valid outline for this topic. It may be too abstract or lack sufficient context in your documents. Please try rephrasing.");
    }

    // --- STAGE 3: THE AUTHOR AGENT ---
     const authorPrompt = `
      You are a world-class academic author and educator. Your writing style is the perfect balance between a university textbook and a brilliant, clear tutor. Your primary goal is to write a comprehensive, self-contained study chapter that is so clear a student can fully understand the topic from this note alone.
      
      **Full Context:**
      - Exam: "${exam_name}"
      - Main Chapter Topic: "${day_topic}"
      - Specific Sub-Topic to Write About: "${sub_topic_text}"
      
      **UNBREAKABLE RULE #1: AUDIENCE IS EVERYTHING.** The "Exam" context is your most important filter. A note for "Class 10th Physics" MUST be simpler, use more basic analogies, and avoid complex graphs compared to a note for "Undergraduate Quantum Mechanics". You must tailor the depth, examples, and tone to this specific audience.
      
      **Chapter Outline You MUST Follow Exactly:**
      ---
      ${chapterOutline}
      ---
      
      Reference Material & Images: Provided as multimodal input.
      
      **CRITICAL INSTRUCTIONS FOR NOTE QUALITY:**
      1.  **Follow the Outline:** Meticulously follow the provided outline. Do not deviate.
      2.  **Textbook Quality:** Write with clarity, precision, and authority. Ensure end-to-end coverage of the concepts listed in the outline.
      3.  **Use Analogies & Examples:** Where appropriate, use simple analogies and real-world examples to make complex topics relatable and memorable for the target audience.
      4.  **Include Practice Questions:** Conclude the chapter with a "Check Your Understanding" section containing 2-3 conceptual questions that test the core ideas of the note. This is mandatory.
      5.  **Formatting:** Use beautiful, clean Markdown. Use LaTeX for all mathematical equations ($...$ for inline, $$...$$ for block-level).
      6.  **No Redundant Titles:** Your response must NOT repeat the main topic or sub-topic as a title. Begin directly with the first point of the outline (e.g., "### I. Introduction...").

      **LATEX STYLE GUIDE (UNBREAKABLE RULES FOR KATEX COMPATIBILITY):**
      - **For Matrices:** ALWAYS use the capitalized version: \`\\begin{Vmatrix}\` ... \`\\end{Vmatrix}\`.
      - **Special Characters:** Inside any math block, you MUST escape standalone percentage signs like this: \`\\%\`.
      - **Clarity:** Ensure all brackets and delimiters are correctly matched.
    
     **ILLUSTRATION & DIAGRAMS (STRICT GUIDELINES):**
      Your goal is to be a brilliant author, not just a graph generator.
      1.  **UNBREAKABLE RULE #2: EXTREME CONSERVATISM.** Illustrations are a high-cost feature. You must only request one if a core concept is **truly impossible** to explain clearly with text and examples alone.
      2.  **UNBREAKABLE RULE #3: SUPPORTED ENGINES ONLY.** You are authorized to use ONLY two engines: **'mermaid'** for flowcharts/diagrams and **'matplotlib'** for graphs/plots.** Do not request any other type of illustration.
      3.  **Placement:** Insert the placeholder immediately after the paragraph that explains the concept.
      
      Example for a Flowchart:
      \`\`\`kalpad-illustration
      {
        "engine": "mermaid",
        "description": "A simple flowchart that starts at A, goes to a process B, and ends at C. It must be appropriate for the audience's level."
      }
      \`\`\`

      Example for a Plot:
      \`\`\`kalpad-illustration
      {
        "engine": "matplotlib",
        "description": "A simple plot of y = sin(x) from 0 to 2*pi, demonstrating one full period of a sine wave. It must be essential for understanding."
      }
      \`\`\`
      `;

    const authorResult = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: authorPrompt }, ...imageParts] }]
    });
    const notesText = authorResult.response.candidates[0].content.parts[0].text;

    // --- STAGE 4: FINAL CONTENT VALIDATION (Unchanged) ---
    if (!notesText || notesText.trim().length < 50) {
        throw new Error("The AI failed to generate a sufficiently detailed note from the outline. Please try again.");
    }
    
    // --- DATABASE WRITE & INNGEST (Unchanged) ---
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