// src/api/ingest-document/route.js
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

    const { text_chunks, page_image_urls, file_name } = await request.json();
    
    // Safety first: delete any old version of this document to prevent duplicates.
    await supabase.from('documents').delete().eq('user_id', session.user.id).eq('file_name', file_name);

    const documentsToInsert = [];
    let failedChunks = 0;

    // --- 1. Process Text Chunks with Fault-Tolerant Batching ---
    const textEmbeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const AI_BATCH_SIZE = 99;

    for (let i = 0; i < text_chunks.length; i += AI_BATCH_SIZE) {
        const batchChunks = text_chunks.slice(i, i + AI_BATCH_SIZE);
        try {
            const textBatchResult = await textEmbeddingModel.batchEmbedContents({
                requests: batchChunks.map(chunk => ({ content: { parts: [{ text: chunk }] } })),
            });
            const batchEmbeddings = textBatchResult.embeddings;

            // Re-combine the successful chunks with their embeddings
            batchChunks.forEach((chunk, j) => {
                documentsToInsert.push({
                    content: chunk,
                    embedding: batchEmbeddings[j].values,
                    // Other fields will be added later
                });
            });

        } catch (error) {
            console.error(`A batch of ${batchChunks.length} text chunks failed to embed. Skipping batch. Error: ${error.message}`);
            failedChunks += batchChunks.length;
        }
    }
    console.log(`Successfully embedded ${documentsToInsert.length} of ${text_chunks.length} text chunks.`);

    // 2. Prepare all document entries for final insertion
    const finalDocumentsToInsert = [];
    // First, the image entries
    page_image_urls.forEach((url, index) => {
        finalDocumentsToInsert.push({
            user_id: session.user.id, file_name,
            content_type: 'image_page',
            page_number: index + 1,
            image_url: url,
            embedding: null,
        });
    });

    // Then, the successful text entries
    const chunksPerPage = Math.ceil(documentsToInsert.length / page_image_urls.length);
    documentsToInsert.forEach((doc, i) => {
        finalDocumentsToInsert.push({
            user_id: session.user.id, file_name,
            content_type: 'text_chunk',
            page_number: Math.floor(i / chunksPerPage) + 1,
            content: doc.content,
            embedding: doc.embedding,
        });
    });

    // 3. Save everything
    if (finalDocumentsToInsert.length > 0) {
        // We can insert everything in one go as it's just data
        const { error: insertError } = await supabase.from('documents').insert(finalDocumentsToInsert);
        if (insertError) throw new Error(`DB error: ${insertError.message}`);
    }

    const successMessage = `Successfully ingested content for '${file_name}'. ${documentsToInsert.length} text chunks were indexed.`;
    const finalMessage = failedChunks > 0 ? `${successMessage} ${failedChunks} text chunks failed to process.` : successMessage;

    return new Response(JSON.stringify({ message: finalMessage }), { status: 200 });
  } catch (error) {
    console.error('Full error in ingest-document API:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}