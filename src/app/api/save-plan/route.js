// src/api/save-plan/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Note: We no longer need the Gemini AI client in this file.
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

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

    // 2. Prepare the topics for insertion. This is now a simple formatting step.
    const topicsToInsert = plan_topics.map((topic, index) => {
        // Simple proportional distribution of images
        const totalDays = plan_topics.length;
        const totalImages = page_image_urls?.length || 0;
        const startIdx = Math.floor(index * (totalImages / totalDays));
        const endIdx = Math.floor((index + 1) * (totalImages / totalDays));
        const relevantImages = page_image_urls?.slice(startIdx, endIdx) || [];

        return {
            ...topic,
            day: Math.round(topic.day || 0),
            study_hours: Math.round(topic.study_hours || 0),
            importance: Math.round(topic.importance || 5),
            plan_id: planData.id,
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