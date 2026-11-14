// src/lib/byok/pipelines/researchAssistant.js
/**
 * Client-side Research Consultant powered by ChatGPT BYOK quota.
 * Fetches grounded paper excerpts via non-AI /api/research/context (or Supabase directly)
 * and synthesizes the cited response using modelPreferences.researchModel.
 */

import supabase from '../../supabaseClient.js';
import { ensureByokConnected, generateText, resolveModelForTask } from '../openai.js';

/**
 * Retrieves paper context cleanly from Supabase without running server LLM generation.
 */
async function fetchResearchContext(projectId) {
  try {
    const res = await fetch('/api/research/context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    });
    if (res.ok) {
      const payload = await res.json();
      if (Array.isArray(payload.papers)) {
        return payload.papers;
      }
    }
  } catch (_) {}

  const { data: papers } = await supabase
    .from('research_papers')
    .select('id, title, abstract, authors, year, key_takeaways, structured_analysis')
    .eq('project_id', projectId)
    .limit(15);

  return papers || [];
}

/**
 * Answers a student research question grounded in project papers via ChatGPT BYOK quota.
 *
 * @param {{ query: string, projectId: string, signal?: AbortSignal }} params
 * @returns {Promise<{ response: string }>}
 */
export async function askResearchConsultantBYOK({ query, projectId, signal }) {
  if (!query || !projectId) {
    throw new Error('Missing query or project ID.');
  }

  const token = await ensureByokConnected();
  const model = await resolveModelForTask('researchModel', { accessToken: token });
  const papers = await fetchResearchContext(projectId);

  const contextText =
    papers.length > 0
      ? papers
          .map((p) => {
            const summary =
              p.structured_analysis?.summary ||
              p.key_takeaways ||
              p.abstract ||
              'No abstract extracted yet.';
            return `SOURCE [ID: ${p.id}] - Title: "${p.title || 'Untitled'}"\nContent: ${typeof summary === 'string' ? summary : JSON.stringify(summary)}\n---`;
          })
          .join('\n\n')
      : 'No relevant documents found. The user might need to add papers to the project.';

  const prompt = `You are KalPad, a super-smart, brutally honest AI Research Consultant.
Your tone is that of an "Indian Genius Friend" — witty, academically rigorous, and direct.

**MISSION:** Answer the User Question based EXCLUSIVELY on the Source Context provided.

**RULES:**
1. GROUNDING: Use ONLY the provided context. If the answer isn't there, say: "Listen, based on the papers you've added so far, I don't have enough data to give you a solid answer. Try scouting for more relevant sources."
2. CITATIONS: You MUST cite every claim. Use the exact format [Paper ID] at the end of relevant sentences.
3. TONE: Be a mentor. Don't use corporate jargon. Use clear, intuitive explanations.
4. STRUCTURE: Use Markdown for readability. Use LaTeX ($) for any equations.

**SOURCE CONTEXT:**
${contextText}

**USER QUESTION:**
"${query}"`;

  const responseText = await generateText({
    accessToken: token,
    model,
    prompt,
    signal,
  });

  return { response: responseText };
}
