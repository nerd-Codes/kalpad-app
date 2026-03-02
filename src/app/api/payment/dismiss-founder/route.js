// src/app/api/payment/dismiss-founder/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logRouteResult, resolveRouteAuth, unauthorizedResponse } from '@/lib/routeAuth';

export async function POST(request) {
    const auth = await resolveRouteAuth(request);
    const authMode = auth.authMode;
    if (!auth.user) {
        logRouteResult('/api/payment/dismiss-founder', authMode, 401);
        return unauthorizedResponse();
    }

    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    await supabaseAdmin
        .from('user_subscriptions')
        .update({ founder_notified: true })
        .eq('user_id', auth.user.id);

    logRouteResult('/api/payment/dismiss-founder', authMode, 200);
    return NextResponse.json({ success: true });
}
