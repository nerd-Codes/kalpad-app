// /src/app/api/start-lecture-curation/route.js

import { inngest } from '@/lib/inngest';
import { logRouteResult, resolveRouteAuth, unauthorizedResponse } from '@/lib/routeAuth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    let authMode = 'none';

    try {
        const auth = await resolveRouteAuth(request);
        authMode = auth.authMode;
        const { supabase, user } = auth;
        if (!user) {
            logRouteResult('/api/start-lecture-curation', authMode, 401);
            return unauthorizedResponse();
        }

        // 1. Receive the FULL, rich payload from the client.
        const payload = await request.json();
        const { plan_id, topics_to_curate, all_todays_topics, timezone } = payload;

        if (!plan_id || !topics_to_curate || !all_todays_topics) {
            return new Response(JSON.stringify({ error: 'Missing required payload fields.' }), { status: 400 });
        }

        // 2. Create the job record in the database.
        const { data: jobData, error: jobError } = await supabase
            .from('curation_jobs')
            .insert({
                plan_id: plan_id,
                status: 'pending',
                total_topics: topics_to_curate.length,
                completed_topics: 0
            })
            .select('id')
            .single();

        if (jobError) throw jobError;

        // 3. Send the COMPLETE event to Inngest, passing all necessary data.
        await inngest.send({
            name: 'lecture-scout/curation.requested',
            data: {
                job_id: jobData.id,
                sub_topics_to_curate: topics_to_curate,
                all_todays_topics: all_todays_topics, // <-- This is the critical piece
                user_timezone: timezone,
            }
        });
        
        // 4. Respond to the client with the job ID so it can start polling.
        logRouteResult('/api/start-lecture-curation', authMode, 202);
        return new Response(JSON.stringify({ job_id: jobData.id }), {
            status: 202, // 202 Accepted
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Error starting lecture curation job:", error);
        logRouteResult('/api/start-lecture-curation', authMode, 500);
        return new Response(JSON.stringify({ error: 'Failed to start curation job.', details: error.message }), {
            status: 500,
        });
    }
}
