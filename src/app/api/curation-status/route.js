// src/app/api/curation-status/route.js

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    // --- THIS IS THE FIX ---
    // The Supabase client and session are initialized outside the try...catch block
    // to comply with Next.js's dynamic function requirements.
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    
    try {
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

        return new Response(JSON.stringify(job), { status: 200 });

    } catch (error) {
        console.error("Error fetching curation status:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}