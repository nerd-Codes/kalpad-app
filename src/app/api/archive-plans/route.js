// src/app/api/archive-plans/route.js
import { logRouteResult, resolveRouteAuth, unauthorizedResponse } from '@/lib/routeAuth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  let authMode = 'none';
  try {
    const auth = await resolveRouteAuth(request);
    authMode = auth.authMode;
    const { supabase, user } = auth;
    if (!user) {
      logRouteResult('/api/archive-plans', authMode, 401);
      return unauthorizedResponse();
    }

    const { planIds } = await request.json();

    if (!planIds || !Array.isArray(planIds) || planIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Plan IDs must be a non-empty array.' }), { status: 400 });
    }

    // This performs a single, efficient bulk update operation.
    const { error } = await supabase
      .from('study_plans')
      .update({ is_active: false })
      .in('id', planIds)
      .eq('user_id', user.id); // Ensure users can only update their own plans.

    if (error) {
      console.error('Supabase error during plan archival:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    logRouteResult('/api/archive-plans', authMode, 200);
    return new Response(JSON.stringify({ message: `${planIds.length} plan(s) archived successfully.` }), { status: 200 });

  } catch (error) {
    console.error('Full error in archive-plans API:', error);
    logRouteResult('/api/archive-plans', authMode, 500);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
