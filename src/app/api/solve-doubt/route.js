// /src/app/api/solve-doubt/route.js

// --- MODIFICATION: Import our robust Vertex AI utility ---
import { getVertexAIModel } from '@/lib/vertexai';

// --- MODIFICATION: The 'groq' dependency is no longer needed ---

export async function POST(req) {
  try {
    const body = await req.json();
    const payload = body.data || body;

    const { 
        fullNoteContent,
        highlightedText,
        question,
        action,
        context 
    } = payload;
    
    // --- Input Validation is unchanged ---
    if (!action || !context) {
        return new Response(JSON.stringify({ error: 'Missing required fields: action and context' }), { status: 400 });
    }
    if ((action === 'explain' || action === 'analogy' || action === 'importance') && !highlightedText) {
        return new Response(JSON.stringify({ error: 'highlightedText is required for this action' }), { status: 400 });
    }
    if (action === 'custom' && !question) {
        return new Response(JSON.stringify({ error: 'question is required for the custom action' }), { status: 400 });
    }

    // --- Dynamic Prompt Construction (Unchanged) ---
    let systemPrompt = `You are KalPad, an AI Tutor. Your persona is that of a brutally honest, slightly unhinged genius friend or big brother. You are not a formal, stuffy professor. Your goal is to make learning feel like a conversation with a brilliant friend who genuinely wants the user to succeed.
    - **Tone:** Use a conversational, slightly informal tone. Use "you" and "I". Be direct, witty, and encouraging.
    - **Clarity:** Break down complex topics into simple, digestible pieces. Use analogies and real-world examples.
    - **Formatting:** Your entire response MUST be in clean, well-structured Markdown.
    - **Conciseness:** Get to the point. Don't waste time with pleasantries.
    - **Engagement:** Ask rhetorical questions, use humor, and be relatable. Make the user feel like they're chatting with a knowledgeable friend.
    - **CRITICAL INSTRUCTION:** USe KaTex compatible syntax for all mathematical expressions. Always wrap inline math in single dollar signs ($...$) and display math in double dollar signs ($$...$$). Never use backticks or any other formatting for math.
    `;

    let userPrompt;
    if (action === 'custom') {
        systemPrompt += `\nYour primary source of truth is the full note content provided by the user. Answer the user's question based on this context.`;
        userPrompt = `I am studying for my "${context.examName}" exam. My current topic is "${context.dayTopic}", and I'm looking at notes for the sub-topic "${context.subTopic}".\n\nHere is the full content of my notes for context:\n---\n${fullNoteContent}\n---\n\nMy Question: "${question}"\n\nPlease answer my question concisely.`;
    } else {
        systemPrompt += `\nYour task is to respond to a specific request about a piece of highlighted text from a larger note. The user has the full note, so you do not need to repeat context.`;
        userPrompt = `I am studying for my "${context.examName}" exam, focusing on the sub-topic "${context.subTopic}". I have highlighted the following text from my notes:\n\nHighlighted Text: "${highlightedText}"\n\nMy Request: "${action === 'explain' ? "Explain this to me like I'm 10." : action === 'analogy' ? "Give me a real-world analogy for this." : "Explain why this concept is important."}"\n\nPlease provide a direct and concise response.`;
    }
     
    // --- DEFINITIVE MIGRATION: Switch from Groq to Vertex AI ---
    
    // 1. Get the Vertex AI model. 'gemini-1.5-flash-001' is an excellent choice for speed and a large context window.
    const model = await getVertexAIModel('gemini-2.5-flash-lite');

    // 2. Construct the request payload in the format Vertex AI expects.
    const requestPayload = {
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        contents: [{ 
            role: 'user', 
            parts: [{ text: userPrompt }] 
        }],
        generationConfig: {
            maxOutputTokens: 2048, // Generous limit for detailed answers
            temperature: 0.7,      // A balanced temperature for creative but factual responses
        }
    };
    
    // 3. Call the generateContent method.
    const response = await model.generateContent(requestPayload);

    // 4. Parse the response from the Vertex AI SDK's structure.
    const aiResponseText = response.response.candidates[0]?.content?.parts[0]?.text || 'Sorry, I could not generate a response.';

    // Return the full response in a single JSON object (unchanged).
    return new Response(JSON.stringify({ response: aiResponseText }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in /api/solve-doubt:', error);
    // The Vertex AI SDK often nests the core error message, so we check for it.
    const errorMessage = error.response?.candidates?.[0]?.finishReason || error.message || 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}