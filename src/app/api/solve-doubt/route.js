// src/app/api/solve-doubt/route.js
import Groq from 'groq-sdk';

// NOTE: We no longer import anything from the 'ai' package.
// The Edge runtime is removed as it's primarily for streaming.
// export const runtime = 'edge'; 

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req) {
  try {
    const body = await req.json();
    // The frontend now nests the payload inside a `data` property.
    // We will defensively check for both structures for robustness.
    const payload = body.data || body;

    const { 
        fullNoteContent,
        highlightedText,
        question,
        action,
        context 
    } = payload;
    
    // --- Input Validation (Unchanged) ---
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
    
    // --- DEFINITIVE FIX: NON-STREAMING API CALL ---
    const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        stream: false, // Explicitly disable streaming
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        max_tokens: 1024, 
    });

    const aiResponseText = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    // Return the full response in a single JSON object
    return new Response(JSON.stringify({ response: aiResponseText }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in /api/solve-doubt:', error);
    const errorMessage = error.error?.message || error.message || 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}