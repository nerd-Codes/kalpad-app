// src/app/api/sync-guest-data/route.js

import { NextResponse } from 'next/server';
import { logRouteResult, resolveRouteAuth, unauthorizedResponse } from '@/lib/routeAuth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    let authMode = 'none';
    try {
        const auth = await resolveRouteAuth(request);
        authMode = auth.authMode;
        const { supabase, user } = auth;
        if (!user) {
            logRouteResult('/api/sync-guest-data', authMode, 401);
            return unauthorizedResponse();
        }

        const body = await request.json();
        const { 
            examName, 
            examDate, 
            syllabus, 
            plan, // Array of day objects
            generationContext, 
            generatedNotes = [] 
        } = body;

        // 1. Create the Master Plan
        const { data: newPlan, error: planError } = await supabase
            .from('study_plans')
            .insert({
                user_id: user.id,
                exam_name: examName,
                exam_date: examDate,
                syllabus: syllabus,
                generation_context: generationContext,
                is_active: true
            })
            .select('id')
            .single();

        if (planError) throw new Error(`Plan creation failed: ${planError.message}`);

        // 2. Prepare Topics for Bulk Insertion
        // We need to insert them and GET BACK their IDs to link notes later.
        const topicsPayload = plan.map((day) => ({
            plan_id: newPlan.id,
            day: day.day,
            date: day.date,
            topic_name: day.topic_name,
            study_hours: day.study_hours,
            importance: day.importance || 5,
            day_difficulty: day.day_difficulty,
            day_summary: day.day_summary,
            sub_topics: day.sub_topics
        }));

        const { data: insertedTopics, error: topicsError } = await supabase
            .from('plan_topics')
            .insert(topicsPayload)
            .select('id, day, topic_name'); // Select IDs to map notes

        if (topicsError) throw new Error(`Topics creation failed: ${topicsError.message}`);

        // 3. Link & Insert Notes (if any exist)
        if (generatedNotes && generatedNotes.length > 0) {
            const notesPayload = [];

            for (const note of generatedNotes) {
                // Find the matching topic ID.
                // We match based on 'day' (most reliable) or 'topic_name'.
                const parentTopic = insertedTopics.find(t => t.day === note.day);

                if (parentTopic) {
                    notesPayload.push({
                        user_id: user.id,
                        plan_topic_id: parentTopic.id,
                        sub_topic_text: note.sub_topic_text,
                        notes_markdown: note.notes_markdown,
                        created_at: new Date().toISOString()
                    });
                }
            }

            if (notesPayload.length > 0) {
                const { error: notesError } = await supabase
                    .from('generated_notes')
                    .insert(notesPayload);
                
                if (notesError) console.error("Notes sync warning:", notesError);
            }
        }

        logRouteResult('/api/sync-guest-data', authMode, 200);
        return NextResponse.json({ success: true, planId: newPlan.id });

    } catch (error) {
        console.error("Sync Guest Data Error:", error);
        logRouteResult('/api/sync-guest-data', authMode, 500);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
