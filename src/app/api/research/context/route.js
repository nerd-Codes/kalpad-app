// src/app/api/research/context/route.js
import { logRouteResult, resolveRouteAuth, unauthorizedResponse } from '@/lib/routeAuth';

export const dynamic = 'force-dynamic';

/**
 * Non-AI endpoint that retrieves grounded research paper metadata/excerpts
 * from Supabase so the browser can synthesize answers via ChatGPT BYOK.
 */
export async function POST(request) {
  let authMode = 'none';
  try {
    const auth = await resolveRouteAuth(request);
    authMode = auth.authMode;
    const { supabase, user } = auth;
    if (!user) {
      logRouteResult('/api/research/context', authMode, 401);
      return unauthorizedResponse();
    }

    const body = await request.json().catch(() => ({}));
    const projectId = body?.projectId;
    if (!projectId) {
      logRouteResult('/api/research/context', authMode, 400);
      return new Response(JSON.stringify({ error: 'Missing projectId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: papers, error } = await supabase
      .from('research_papers')
      .select('id, title, abstract, authors, year, key_takeaways, structured_analysis')
      .eq('project_id', projectId)
      .limit(15);

    if (error) {
      logRouteResult('/api/research/context', authMode, 500);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    logRouteResult('/api/research/context', authMode, 200);
    return new Response(JSON.stringify({ papers: papers || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    logRouteResult('/api/research/context', authMode, 500);
    return new Response(JSON.stringify({ error: err?.message || 'Failed to load context' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
