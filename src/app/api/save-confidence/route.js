// src/app/api/save-confidence/route.js
import { logRouteResult, resolveRouteAuth, unauthorizedResponse } from '@/lib/routeAuth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  let authMode = 'none';
  try {
    const auth = await resolveRouteAuth(request);
    authMode = auth.authMode;
    const { supabase, user } = auth;
    if (!user) {
      logRouteResult('/api/save-confidence', authMode, 401);
      return unauthorizedResponse();
    }

    const { plan_topic_id, activity_type, score } = await request.json();
    if (!plan_topic_id || !activity_type || score === null) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const { error } = await supabase
      .from('topic_confidence')
      .insert({
          plan_topic_id: plan_topic_id,
          activity_type: activity_type,
          score: score,
          user_id: user.id
      });

    if (error) throw error;

    logRouteResult('/api/save-confidence', authMode, 200);
    return new Response(JSON.stringify({ message: 'Score saved successfully.' }), { status: 200 });
  } catch (error) {
    console.error('Error saving confidence score:', error);
    logRouteResult('/api/save-confidence', authMode, 500);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
