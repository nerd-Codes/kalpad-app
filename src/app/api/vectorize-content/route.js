// src/app/api/vectorize-content/route.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logRouteResult, resolveRouteAuth, unauthorizedResponse } from '@/lib/routeAuth';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const dynamic = 'force-dynamic';

export async function POST(request) {
  let authMode = 'none';
  try {
    const auth = await resolveRouteAuth(request);
    authMode = auth.authMode;
    const { supabase, user } = auth;
    if (!user) {
      logRouteResult('/api/vectorize-content', authMode, 401);
      return unauthorizedResponse();
    }

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
        user_id: user.id,
        content: chunk,
        embedding: textBatchResult.embeddings[i].values,
        content_type: 'text',
    }));

    const { error: insertError } = await supabase.from('documents').insert(documentsToInsert);
    if (insertError) throw new Error(`Database error: ${insertError.message}`);

    logRouteResult('/api/vectorize-content', authMode, 200);
    return new Response(JSON.stringify({ message: `Successfully stored ${documentsToInsert.length} text chunks.` }), { status: 200 });
  } catch (error) {
    console.error('Error in vectorize-content API:', error);
    logRouteResult('/api/vectorize-content', authMode, 500);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
