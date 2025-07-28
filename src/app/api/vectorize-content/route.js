// src/app/api/vectorize-content/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    // This API now ONLY receives text chunks
    const { chunks } = await request.json();
    if (!chunks || chunks.length === 0) {
      return new Response(JSON.stringify({ error: 'No text chunks provided' }), { status: 400 });
    }

    const textEmbeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const textBatchResult = await textEmbeddingModel.batchEmbedContents({
        requests: chunks.map(chunk => ({ content: { parts: [{ text: chunk }] } })),
    });
    const documentsToInsert = chunks.map((chunk, i) => ({
        user_id: session.user.id,
        content: chunk,
        embedding: textBatchResult.embeddings[i].values,
        content_type: 'text',
    }));

    const { error: insertError } = await supabase.from('documents').insert(documentsToInsert);
    if (insertError) throw new Error(`Database error: ${insertError.message}`);

    return new Response(JSON.stringify({ message: `Successfully stored ${documentsToInsert.length} text chunks.` }), { status: 200 });
  } catch (error) {
    console.error('Error in vectorize-content API:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}