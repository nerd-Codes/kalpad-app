// src/app/api/archive-plans/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
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
      .eq('user_id', session.user.id); // Ensure users can only update their own plans.

    if (error) {
      console.error('Supabase error during plan archival:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return new Response(JSON.stringify({ message: `${planIds.length} plan(s) archived successfully.` }), { status: 200 });

  } catch (error) {
    console.error('Full error in archive-plans API:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}