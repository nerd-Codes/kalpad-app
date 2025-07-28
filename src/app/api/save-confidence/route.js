// src/app/api/save-confidence/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

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
          user_id: session.user.id
      });

    if (error) throw error;

    return new Response(JSON.stringify({ message: 'Score saved successfully.' }), { status: 200 });
  } catch (error) {
    console.error('Error saving confidence score:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}