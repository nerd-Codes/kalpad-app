// src/app/api/timeline/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // 1. Authorize the user (Unchanged and Correct)
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // 2. Get the target date (Unchanged and Correct)
    const { searchParams } = new URL(request.url);
    const targetDate = searchParams.get('date');
    if (!targetDate) {
      return new Response(JSON.stringify({ error: 'Date parameter is required' }), { status: 400 });
    }

    // --- DEFINITIVE FIX: THE CORRECT QUERY ARCHITECTURE ---
    // This query combines the correct starting table with the complete V2 data selection.
    const { data, error } = await supabase
      .from('study_plans')
      .select(`
        id,
        exam_name,
        exam_date,
        plan_topics!inner (
          *,
          new_notes: generated_notes ( * )
        )
      `)
      .eq('is_active', true)
      .eq('user_id', session.user.id)
      .eq('plan_topics.date', targetDate); // The inner join filter is correct

    if (error) {
      console.error("Error fetching timeline data:", error);
      throw new Error(error.message);
    }

    // 4. Return the RAW data. No transformation.
    // The data structure is now an array of plan objects, each containing a
    // plan_topics array with the single topic for that day. This is exactly what the frontend needs.
    return new Response(JSON.stringify(data), { status: 200 });

  } catch (error) {
    console.error('Full error in timeline API:', error);
    return new Response(JSON.stringify({ error: error.message || 'An internal error occurred.' }), { status: 500 });
  }
}