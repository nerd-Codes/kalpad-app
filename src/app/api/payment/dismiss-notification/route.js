import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logRouteResult, resolveRouteAuth, unauthorizedResponse } from '@/lib/routeAuth';

export async function POST(request) {
    const auth = await resolveRouteAuth(request);
    const authMode = auth.authMode;
    if (!auth.user) {
        logRouteResult('/api/payment/dismiss-notification', authMode, 401);
        return unauthorizedResponse();
    }

    const { txnid } = await request.json();

    // Use Admin Client to write to the protected audit table
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    await supabaseAdmin
        .from('payment_transactions')
        .update({ user_notified: true })
        .eq('txnid', txnid)
        .eq('user_id', auth.user.id); // Security check

    logRouteResult('/api/payment/dismiss-notification', authMode, 200);
    return NextResponse.json({ success: true });
}
