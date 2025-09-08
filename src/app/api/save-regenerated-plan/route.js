// src/app/api/save-regenerated-plan/route.js
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

    const { 
        old_plan_id, 
        new_plan_topics, 
        new_strategy,
        exam_name,
        exam_date
    } = await request.json();

    if (!old_plan_id || !new_plan_topics || !new_strategy || !exam_name || !exam_date) {
      return new Response(JSON.stringify({ error: 'Missing required data for saving regenerated plan.' }), { status: 400 });
    }

    // This is the definitive, atomic database operation.
    // It calls the PostgreSQL function which handles the entire transaction.
    const { data: newPlanId, error: rpcError } = await supabase.rpc('archive_and_create_new_plan', {
        old_plan_id: old_plan_id,
        new_exam_name: exam_name,
        new_exam_date: exam_date,
        new_context: JSON.stringify(new_strategy),
        new_topics: new_plan_topics
    });
    
    if (rpcError) {
        console.error('Supabase RPC error in archive_and_create_new_plan:', rpcError);
        throw new Error(`Database transaction failed: ${rpcError.message}`);
    }

    return new Response(JSON.stringify({ message: 'Plan regenerated and saved successfully', new_plan_id: newPlanId }), { status: 200 });

  } catch (error) {
    console.error('Full error in save-regenerated-plan API:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}