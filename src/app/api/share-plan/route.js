// src/app/api/share-plan/route.js
import { createClient } from '@supabase/supabase-js';
import { logRouteResult, resolveRouteAuth, unauthorizedResponse } from '@/lib/routeAuth';

// Use the Service Role Key for elevated privileges, ONLY on the server.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const dynamic = 'force-dynamic';

export async function POST(request) {
  let authMode = 'none';
  try {
    const auth = await resolveRouteAuth(request);
    authMode = auth.authMode;
    const { supabase, user } = auth;
    if (!user) {
      logRouteResult('/api/share-plan', authMode, 401);
      return unauthorizedResponse();
    }

    const { plan_id } = await request.json();
    if (!plan_id) {
      return new Response(JSON.stringify({ error: 'Plan ID is required.' }), { status: 400 });
    }

    // 1. Check if this plan has already been shared.
    const { data: existingPublicPlan, error: checkError } = await supabaseAdmin
      .from('public_plans')
      .select('public_id')
      .eq('source_plan_id', plan_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // Ignore 'no rows found' error
      throw checkError;
    }

    if (existingPublicPlan) {
      // If it exists, just return the existing ID.
      return new Response(JSON.stringify({ public_id: existingPublicPlan.public_id }), { status: 200 });
    }

    // 2. If not shared, fetch the full private plan.
    const { data: privatePlan, error: privatePlanError } = await supabase
      .from('study_plans')
      .select('*, plan_topics(*)')
      .eq('id', plan_id)
      .eq('user_id', user.id)
      .single();

    if (privatePlanError || !privatePlan) {
      throw new Error('Private plan not found or access denied.');
    }

    // 3. Create a new public plan entry.
    const { data: newPublicPlan, error: publicPlanError } = await supabaseAdmin
      .from('public_plans')
      .insert({
        source_plan_id: privatePlan.id,
        user_id: user.id,
        exam_name: privatePlan.exam_name,
        exam_date: privatePlan.exam_date,
        generation_context: privatePlan.generation_context
      })
      .select('public_id')
      .single();

    if (publicPlanError) throw publicPlanError;

    // 4. Sanitize and insert the public plan topics.
    const topicsToInsert = privatePlan.plan_topics.map(topic => ({
      public_plan_id: newPublicPlan.public_id,
      day: topic.day,
      date: topic.date,
      topic_name: topic.topic_name,
      study_hours: topic.study_hours,
      day_difficulty: topic.day_difficulty,
      day_summary: topic.day_summary,
      sub_topics: topic.sub_topics
    }));

    const { error: topicsError } = await supabaseAdmin
      .from('public_plan_topics')
      .insert(topicsToInsert);

    if (topicsError) throw topicsError;

    // 5. Return the new public ID.
    logRouteResult('/api/share-plan', authMode, 201);
    return new Response(JSON.stringify({ public_id: newPublicPlan.public_id }), { status: 201 });

  } catch (error) {
    console.error('Full error in share-plan API:', error);
    logRouteResult('/api/share-plan', authMode, 500);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
