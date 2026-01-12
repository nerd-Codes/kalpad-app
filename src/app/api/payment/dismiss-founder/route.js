// src/app/api/payment/dismiss-founder/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({}, { status: 401 });

    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    await supabaseAdmin
        .from('user_subscriptions')
        .update({ founder_notified: true })
        .eq('user_id', session.user.id);

    return NextResponse.json({ success: true });
}