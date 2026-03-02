// src/app/api/vectorize-chunks/route.js - FINAL BATCHING SOLUTION FOR AI & DB

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
      logRouteResult('/api/vectorize-chunks', authMode, 401);
      return unauthorizedResponse();
    }
    
    const { chunks } = await request.json();
    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
      return new Response(JSON.stringify({ error: 'No chunks provided' }), { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const allDocuments = [];
    const AI_BATCH_SIZE = 100; // The documented limit for Gemini API

    console.log(`Received ${chunks.length} chunks. Processing in AI batches of ${AI_BATCH_SIZE}...`);

    // --- NEW: Step 1 - Batch process embeddings from the AI ---
    for (let i = 0; i < chunks.length; i += AI_BATCH_SIZE) {
      const chunkBatch = chunks.slice(i, i + AI_BATCH_SIZE);
      console.log(`Processing AI batch starting at index ${i}...`);

      const result = await model.batchEmbedContents({
        requests: chunkBatch.map(chunk => ({
          content: { parts: [{ text: chunk }] },
        })),
      });

      const embeddings = result.embeddings;
      if (!embeddings || embeddings.length !== chunkBatch.length) {
        throw new Error(`Mismatch in AI embedding response for batch starting at ${i}.`);
      }

      // Combine the original chunk with its new embedding
      for (let j = 0; j < chunkBatch.length; j++) {
        allDocuments.push({
          user_id: user.id,
          content: chunkBatch[j],
          embedding: embeddings[j].values,
        });
      }
    }
    console.log(`Step 1 complete. Successfully created ${allDocuments.length} embeddings.`);

    // --- Step 2: Insert documents into the database in smaller batches ---
    const DB_BATCH_SIZE = 20; // A safe number for DB inserts
    let successfulInserts = 0;

    console.log(`Step 2: Starting database insert in batches of ${DB_BATCH_SIZE}...`);

    for (let i = 0; i < allDocuments.length; i += DB_BATCH_SIZE) {
      const dbBatch = allDocuments.slice(i, i + DB_BATCH_SIZE);
      console.log(`Inserting DB batch starting at index ${i}...`);

      const { error } = await supabase
        .from('documents')
        .insert(dbBatch);

      if (error) {
        console.error('Supabase batch insert error:', error);
        throw new Error(`Database error during batch insert (starting at index ${i}): ${error.message}`);
      }
      successfulInserts += dbBatch.length;
    }

    const finalMessage = `Process complete. Successfully vectorized and stored ${successfulInserts} of ${chunks.length} chunks.`;
    logRouteResult('/api/vectorize-chunks', authMode, 200);
    return new Response(JSON.stringify({ message: finalMessage }), { status: 200 });

  } catch (error) {
    console.error('Critical error in vectorize-chunks API:', error);
    logRouteResult('/api/vectorize-chunks', authMode, 500);
    return new Response(JSON.stringify({ error: error.message || 'An internal error occurred.' }), { status: 500 });
  }
}
