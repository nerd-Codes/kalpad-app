// src/app/api/start-lecture-curation/route.js

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { inngest } from '@/lib/inngest';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        
        // --- THIS IS THE FIX ---
        // We now accept the new, more precise payload from the frontend modal.
        const { plan_id, topics_to_curate, all_todays_topics, timezone } = await request.json();

        if (!plan_id) {
            return new Response(JSON.stringify({ error: 'Plan ID is required' }), { status: 400 });
        }
        if (!topics_to_curate || topics_to_curate.length === 0) {
            return new Response(JSON.stringify({ message: 'No topics were selected for curation.' }), { status: 200 });
        }

        // The total number of topics for the job is now based on the user's specific selection.
        const { data: job, error: jobError } = await supabase
            .from('curation_jobs')
            .insert({
                plan_id: plan_id,
                status: 'pending',
                total_topics: topics_to_curate.length, // Use the length of the selected topics
            })
            .select()
            .single();

        if (jobError) throw jobError;

        // The Inngest job is now sent with the complete contextual payload.
        await inngest.send({
            name: 'lecture-scout/curation.requested',
            data: {
                job_id: job.id,
                user_id: session.user.id,
                sub_topics_to_curate: topics_to_curate, // The user's specific selection
                cohesion_context: all_todays_topics,   // All of today's topics for the meta-analysis
                user_timezone: timezone,               // The user's timezone for regional results
            },
        });

        return new Response(JSON.stringify({ status: 'Job initiated', job_id: job.id }), { status: 202 });

    } catch (error) {
        console.error("Error starting curation job:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
} 