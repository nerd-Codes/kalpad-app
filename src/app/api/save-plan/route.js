// src/api/save-plan/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { exam_name, exam_date, plan_topics, generation_context, page_image_urls, syllabus } = await request.json();
    if (!exam_name || !exam_date || !plan_topics || !syllabus) {
      return new Response(JSON.stringify({ error: 'Missing required plan data' }), { status: 400 });
    }

    const { data: planData, error: planError } = await supabase.from('study_plans').insert({
        user_id: session.user.id, exam_name, exam_date, generation_context, syllabus,
    }).select().single();
    if (planError) throw new Error(`DB error (study_plans): ${planError.message}`);

    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    
    // --- THIS IS THE DEFINITIVE FIX: Sanitize the data before insertion ---
    const topicsToInsert = await Promise.all(plan_topics.map(async (topic) => {
        let relevantImages = [];
        if (page_image_urls && page_image_urls.length > 0) {
            const embeddingResult = await embeddingModel.embedContent(topic.topic_name);
            const { data: images, error } = await supabase.rpc('match_images', {
                query_embedding: embeddingResult.embedding.values,
                match_threshold: 0.7, match_count: 2, target_user_id: session.user.id
            });
            if (error) {
                console.error(`Error matching images for "${topic.topic_name}":`, error);
            } else {
                relevantImages = images.map(img => supabase.storage.from('study-materials').getPublicUrl(img.file_path).data.publicUrl);
            }
        }
        
        // Sanitize numeric fields to prevent crashes
        return {
            ...topic,
            day: Math.round(topic.day || 0),
            study_hours: Math.round(topic.study_hours || 0),
            importance: Math.round(topic.importance || 5),
            plan_id: planData.id,
            relevant_page_images: relevantImages,
        };
    }));

    const { error: topicsError } = await supabase.from('plan_topics').insert(topicsToInsert);
    if (topicsError) throw new Error(`DB error (plan_topics): ${topicsError.message}`);

    return new Response(JSON.stringify({ message: 'Plan saved successfully' }), { status: 200 });
  } catch (error) {
    console.error('Full error in save-plan API:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}