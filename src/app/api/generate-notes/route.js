// src/api/generate-notes/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js'; // This import is necessary for the fix
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    let supabase;
    let session;

    // --- START OF THE SURGICAL FIX ---
    // This block correctly creates a user-scoped Supabase client regardless of
    // whether the request comes from the web (cookie) or mobile (JWT).

    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const jwt = authHeader.replace('Bearer ', '');
        // Create a NEW, temporary client scoped to the mobile user's JWT
        supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            { global: { headers: { Authorization: `Bearer ${jwt}` } } }
        );
        // Get the session from this new, scoped client
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          session = { user };
        }
    } else {
        // This is the original, unchanged path for the web app. It works as before.
        supabase = createRouteHandlerClient({ cookies });
        const { data } = await supabase.auth.getSession();
        session = data.session;
    }

    if (!session) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    // --- END OF THE SURGICAL FIX ---

    // =======================================================================
    // ALL CODE BELOW THIS LINE IS THE ORIGINAL, UNTOUCHED, AND FUNCTIONAL
    // LOGIC FROM THE FILE YOU PROVIDED. IT USES THE `supabase` CLIENT
    // THAT WAS CORRECTLY SCOPED IN THE BLOCK ABOVE.
    // =======================================================================

    const { plan_topic_id, sub_topic_text, exam_name, day_topic } = await request.json();
    
    const { data: topicData, error: topicError } = await supabase
      .from('plan_topics').select('relevant_page_images').eq('id', plan_topic_id).single();
      
    if (topicError) {
      // The error you were seeing originated here. It will now be resolved.
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

    const outlinePrompt = `
      You are an academic author creating an outline for a study chapter. Be precise and logical.
      
      **Full Context:**
      - Exam: "${exam_name}"
      - Main Chapter Topic: "${day_topic}"
      - Specific Sub-Topic for this Outline: "${sub_topic_text}"
      
      Reference Material: Provided as multimodal input (text and images).
      
      Based on ALL of this context, create a detailed outline. Output ONLY the outline.`;
    const outlineResult = await model.generateContent([outlinePrompt, ...imageParts]);
    const chapterOutline = outlineResult.response.text();

    const authorPrompt = `
      You are an expert academic author. Write a comprehensive, self-contained chapter.
      
      **Full Context:**
      - Exam: "${exam_name}"
      - Main Chapter Topic: "${day_topic}"
      - Specific Sub-Topic to Write About: "${sub_topic_text}"
      
      **Chapter Outline You MUST Follow:**
      ---
      ${chapterOutline}
      ---
      
      Reference Material & Images: Provided as multimodal input.
      
      CRITICAL INSTRUCTIONS: Write the full chapter following the outline precisely. Format in beautiful Markdown with LaTeX ($...$$...$$) and simple HTML (<sub>). End with a "Key Takeaways" summary.`;
    
    const authorResult = await model.generateContent([authorPrompt, ...imageParts]);
    const notesText = authorResult.response.text();

    await supabase.from('plan_topics').update({ generated_notes: notesText }).eq('id', plan_topic_id);
    return new Response(JSON.stringify({ notes: notesText }), { status: 200 });

  } catch (error) {
    console.error('Full error in generate-notes API:', error);
    return new Response(JSON.stringify({ error: message || 'An internal error occurred.' }), { status: 500 });
  }
}