// src/app/api/timeline/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';

export const dynamic = 'force-dynamic';

// --- DEFINITIVE ADDITION #1: UNIVERSAL AUTH FUNCTION ---
// This reusable function handles authentication for both web (cookies) and native (JWT).
async function getAuthenticatedUser(request) {
    const supabase = createRouteHandlerClient({ cookies });
    let user;

    // Try to get user from the mobile app's JWT in the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const jwt = authHeader.replace('Bearer ', '');
        const { data } = await supabase.auth.getUser(jwt);
        user = data.user;
    }

    // If no JWT user, fall back to the web app's cookie session
    if (!user) {
        const { data: { session } } = await supabase.auth.getSession();
        user = session?.user;
    }
    
    return user;
}


export async function GET(request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetDate = searchParams.get('date');
    if (!targetDate) {
      return new Response(JSON.stringify({ error: 'Date parameter is required' }), { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });
    const { data, error } = await supabase
      .from('study_plans')
      .select(`id, exam_name, exam_date, plan_topics!inner ( *, new_notes: generated_notes ( * ) )`)
      .eq('is_active', true)
      .eq('user_id', user.id)
      .eq('plan_topics.date', targetDate);

    if (error) throw new Error(error.message);

    // --- DEFINITIVE FIX: DECLARE THE VARIABLE ---
    // This ensures the variable always exists, even though we are not populating it.
    let triggerNativeAction = null; 

    const responsePayload = {
        plans: data,
        triggerNativeAction: triggerNativeAction
    };
    
    return new Response(JSON.stringify(responsePayload), { status: 200 });

  } catch (error) {
    console.error('Full error in timeline API:', error);
    return new Response(JSON.stringify({ error: error.message || 'An internal error occurred.' }), { status: 500 });
  }
}