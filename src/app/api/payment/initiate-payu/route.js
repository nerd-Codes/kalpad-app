// src/app/api/payment/initiate-payu/route.js

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// --- CONFIGURATION: PRICING SOURCE OF TRUTH ---
const PLANS = {
    'pro_15': { amount: '49.00', name: 'KalPad Pro (15 Days)' },
    'pro_30': { amount: '79.00', name: 'KalPad Pro (30 Days)' },
    'pro_90': { amount: '129.00', name: 'KalPad Pro (3 Months)' },
    'pro_test': { amount: '1.00', name: 'Debug Plan (1 Day)' } 
};

export async function POST(request) {
    try {
        // 1. Authenticate User
        const supabase = createRouteHandlerClient({ cookies });
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user;
        const { planId } = await request.json();
        
        // 2. Validate Plan
        const selectedPlan = PLANS[planId];
        if (!selectedPlan) {
            return NextResponse.json({ error: 'Invalid Plan ID' }, { status: 400 });
        }

        // 3. Prepare PayU Data
        const txnid = `Txn_${Date.now()}_${Math.floor(Math.random() * 1000)}`; // Unique Transaction ID
        const amount = selectedPlan.amount;
        const productinfo = selectedPlan.name;
        const firstname = user.user_metadata?.full_name?.split(' ')[0] || 'Student';
        const email = user.email;
        const phone = '9999999999'; // PayU requires phone, use dummy if not collected, or collect in UI
        
        // We use UDFs (User Defined Fields) to pass critical context through PayU
        // udf1: user_id (So we know who paid when PayU calls us back)
        // udf2: planId (So we know what they bought)
        const udf1 = user.id;
        const udf2 = planId;
        const udf3 = "";
        const udf4 = "";
        const udf5 = "";

        const key = process.env.PAYU_MERCHANT_KEY;
        const salt = process.env.PAYU_MERCHANT_SALT;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

        // --- AUDIT LOGGING ---
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { error: auditError } = await supabaseAdmin
            .from('payment_transactions')
            .insert({
                txnid,
                user_id: user.id,
                plan_id: planId,
                amount: amount,
                status: 'initiated'
            });

        if (auditError) {
            console.error("CRITICAL: Failed to log payment attempt", auditError);
            // We continue anyway so the user can still try to pay, but we log the system failure
        }

        // 4. Generate SHA-512 Hash
        // Formula: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt
        const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;
        
        const hash = crypto.createHash('sha512').update(hashString).digest('hex');

        // 5. Return Form Data
        // The frontend will create a hidden form with these values and submit it.
        return NextResponse.json({
            action: 'https://test.payu.in/_payment', // Use https://test.payu.in/_payment for testing
            params: {
                key,
                txnid,
                amount,
                productinfo,
                firstname,
                email,
                phone,
                surl: `${baseUrl}/api/payment/payu-callback`, // Success Callback
                furl: `${baseUrl}/api/payment/payu-callback`, // Failure Callback
                hash,
                udf1,
                udf2
            }
        });

    } catch (error) {
        console.error("PayU Initiation Failed:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}