// src/app/api/curation-status/route.js

import { logRouteResult, resolveRouteAuth, unauthorizedResponse } from '@/lib/routeAuth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    let authMode = 'none';
    
    try {
        const auth = await resolveRouteAuth(request);
        authMode = auth.authMode;
        const { supabase, user } = auth;
        if (!user) {
            logRouteResult('/api/curation-status', authMode, 401);
            return unauthorizedResponse();
        }

        const { searchParams } = new URL(request.url);
        const job_id = searchParams.get('job_id');
        if (!job_id) return new Response(JSON.stringify({ error: 'Job ID is required' }), { status: 400 });

        const { data: job, error } = await supabase
            .from('curation_jobs')
            .select('status, completed_topics, total_topics')
            .eq('id', job_id)
            .single();

        if (error) throw error;
        if (!job) return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404 });

        logRouteResult('/api/curation-status', authMode, 200);
        return new Response(JSON.stringify(job), { status: 200 });

    } catch (error) {
        console.error("Error fetching curation status:", error);
        logRouteResult('/api/curation-status', authMode, 500);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
