import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({}, { status: 401 });

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
        .eq('user_id', session.user.id); // Security check

    return NextResponse.json({ success: true });
}