import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { generateEmbeddings } from '@/lib/vertexEmbedding'; 
import { getVertexAIModel } from '@/lib/vertexai'; 

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // 1. Auth & Session Verification
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { query, projectId } = await request.json();

    if (!query || !projectId) {
      return new Response(JSON.stringify({ error: 'Missing query or project ID' }), { status: 400 });
    }

    // 2. Generate Query Embedding (Vertex AI - gemini-embedding-001)
    // We pass [query] as an array as per the generateEmbeddings signature
    const embeddings = await generateEmbeddings([query], 'RETRIEVAL_QUERY');
    const queryVector = embeddings[0];

    if (!queryVector) {
        throw new Error("Failed to generate vector representation of your query.");
    }

    // 3. Perform Semantic Search (Supabase RPC)
    const { data: contextChunks, error: rpcError } = await supabase.rpc('match_research_context', {
        query_embedding: queryVector,
        match_threshold: 0.70, // Balanced for research discovery
        match_count: 12,       // Sufficient context for 2.5 Flash
        target_project_id: projectId
    });

    if (rpcError) throw new Error(`Knowledge base search failed: ${rpcError.message}`);

    // 4. Context Assembly
    const contextText = contextChunks && contextChunks.length > 0 
        ? contextChunks.map(chunk => 
            `SOURCE [ID: ${chunk.paper_id}] - Title: "${chunk.paper_title}"\nContent: ${chunk.content_chunk}\n---`
          ).join('\n\n')
        : "No relevant documents found. The user might need to add more papers to the project.";

    // 5. Generate Response (Vertex AI - gemini-2.5-flash)
    const model = await getVertexAIModel('gemini-2.5-flash');

    const prompt = `
        You are KalPad, a super-smart, brutally honest AI Research Consultant. 
        Your tone is that of an "Indian Genius Friend"—witty, academically rigorous, and direct.

        **MISSION:** Answer the User Question based EXCLUSIVELY on the Source Context provided.
        
        **RULES:**
        1. GROUNDING: Use ONLY the provided context. If the answer isn't there, say: "Listen, based on the papers you've added so far, I don't have enough data to give you a solid answer. Try scouting for more relevant sources."
        2. CITATIONS: You MUST cite every claim. Use the exact format [Paper ID] at the end of relevant sentences.
        3. TONE: Be a mentor. Don't use corporate jargon. Use clear, intuitive explanations.
        4. STRUCTURE: Use Markdown for readability. Use LaTeX ($) for any equations.

        **SOURCE CONTEXT:**
        ${contextText}

        **USER QUESTION:**
        "${query}"
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ response: responseText }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Project Curie Chat Failure:', error);
    return new Response(JSON.stringify({ 
        error: error.message || 'The Consultant encountered a cognitive error.',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }), { status: 500 });
  }
}