// src/app/api/timeline/route.js

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // 1. Authorize the user
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    // 2. Get the target date from the query parameters (e.g., /api/timeline?date=2024-07-28)
    const { searchParams } = new URL(request.url);
    const targetDate = searchParams.get('date');

    if (!targetDate) {
      return new Response(JSON.stringify({ error: 'Date parameter is required' }), { status: 400 });
    }

    // 3. The powerful Supabase query to get the data
    const { data, error } = await supabase
      .from('study_plans')
      .select(`
        id,
        exam_name,
        exam_date,
        plan_topics!inner (
          id,
          topic_name,
          sub_topics,
          generated_notes
        )
      `)
      .eq('is_active', true)
      .eq('user_id', session.user.id)
      .eq('plan_topics.date', targetDate); // <-- The magic filter

    if (error) {
      console.error("Error fetching timeline data:", error);
      throw new Error(error.message);
    }

    // 4. The data is already grouped by study_plan (exam), which is perfect.
    // We'll just rename the `plan_topics` array for clarity.
    const groupedTasks = data.map(plan => ({
      examId: plan.id,
      examName: plan.exam_name,
      examDate: plan.exam_date,
      // The inner join ensures this array only contains the topic for the targetDate
      dailyTopic: plan.plan_topics[0] 
    }));

    return new Response(JSON.stringify(groupedTasks), { status: 200 });

  } catch (error) {
    console.error('Full error in timeline API:', error);
    return new Response(JSON.stringify({ error: error.message || 'An internal error occurred.' }), { status: 500 });
  }
}