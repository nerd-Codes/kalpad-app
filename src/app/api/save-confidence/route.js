// src/app/api/save-confidence/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
          const supabase = createRouteHandlerClient({ cookies });
      let session;

      // First, try to get user from the mobile app's JWT in the Authorization header
      const authHeader = request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
          const jwt = authHeader.replace('Bearer ', '');
          const { data: { user } } = await supabase.auth.getUser(jwt);
          // If the JWT is valid, we create a session object
          if (user) {
              session = { user }; 
          }
      }

      // If there was no valid mobile session, fall back to the web app's cookie method
      if (!session) {
          const { data } = await supabase.auth.getSession();
          session = data.session;
      }

      // If we still don't have a session after checking both methods, deny access
      if (!session) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
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
          user_id: session.user.id
      });

    if (error) throw error;

    return new Response(JSON.stringify({ message: 'Score saved successfully.' }), { status: 200 });
  } catch (error) {
    console.error('Error saving confidence score:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}