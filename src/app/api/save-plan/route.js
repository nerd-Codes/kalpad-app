// src/api/save-plan/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Note: We no longer need the Gemini AI client in this file.
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

    const { exam_name, exam_date, plan_topics, generation_context, syllabus, page_image_urls } = await request.json();
    if (!exam_name || !exam_date || !plan_topics || !syllabus) {
      return new Response(JSON.stringify({ error: 'Missing required plan data' }), { status: 400 });
    }

    // 1. Save the main plan details
    const { data: planData, error: planError } = await supabase.from('study_plans').insert({
        user_id: session.user.id,
        exam_name, exam_date, generation_context, syllabus,
    }).select().single();
    if (planError) throw new Error(`DB error (study_plans): ${planError.message}`);

    // 2. Prepare the topics for insertion, now including all V2.2 metadata.
    const topicsToInsert = plan_topics.map((topic, index) => {
        // The image distribution logic remains unchanged.
        const totalDays = plan_topics.length;
        const totalImages = page_image_urls?.length || 0;
        const startIdx = Math.floor(index * (totalImages / totalDays));
        const endIdx = Math.floor((index + 1) * (totalImages / totalDays));
        const relevantImages = page_image_urls?.slice(startIdx, endIdx) || [];

        // The returned object now explicitly includes the new fields for persistence.
        // The `...topic` spread ensures that the enriched `sub_topics` JSONB data is also passed through.
        return {
            ...topic, // Spreads topic_name, sub_topics, etc.
            plan_id: planData.id,
            
            // --- MODIFICATION START: ADDING NEW FIELDS FOR DB INSERTION ---
            day_difficulty: topic.day_difficulty, // Persist the daily difficulty rating.
            day_summary: topic.day_summary,       // Persist the daily summary.
            // --- MODIFICATION END ---
            
            // Data sanitization for numeric types.
            day: Math.round(topic.day || 0),
            study_hours: Math.round(topic.study_hours || 0),
            importance: Math.round(topic.importance || 5),

            // Image association.
            relevant_page_images: relevantImages,
        };
    });

    // 3. Insert the prepared plan topics
    const { error: topicsError } = await supabase.from('plan_topics').insert(topicsToInsert);
    if (topicsError) throw new Error(`DB error (plan_topics): ${topicsError.message}`);

    return new Response(JSON.stringify({ message: 'Plan saved successfully' }), { status: 200 });
  } catch (error) {
    console.error('Full error in save-plan API:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}