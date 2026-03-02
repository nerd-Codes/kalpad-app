// src/app/api/timeline/route.js
import { logRouteResult, resolveRouteAuth, unauthorizedResponse } from '@/lib/routeAuth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  let authMode = 'none';
  try {
    const auth = await resolveRouteAuth(request);
    authMode = auth.authMode;
    const { supabase, user } = auth;
    if (!user) {
      logRouteResult('/api/timeline', authMode, 401);
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const targetDate = searchParams.get('date');
    if (!targetDate) {
      return new Response(JSON.stringify({ error: 'Date parameter is required' }), { status: 400 });
    }

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
    
    logRouteResult('/api/timeline', authMode, 200);
    return new Response(JSON.stringify(responsePayload), { status: 200 });

  } catch (error) {
    console.error('Full error in timeline API:', error);
    logRouteResult('/api/timeline', authMode, 500);
    return new Response(JSON.stringify({ error: error.message || 'An internal error occurred.' }), { status: 500 });
  }
}
