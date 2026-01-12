// src/app/api/payment/payu-callback/route.js

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const PLAN_DURATIONS = {
    'pro_test': 1,
    'pro_15': 15,
    'pro_30': 30,
    'pro_90': 90
};

export async function POST(request) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

    try {
        const formData = await request.formData();
        const data = {};
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }

        const { 
            status, txnid, amount, productinfo, firstname, email, 
            udf1, udf2: plan_id, 
            hash: receivedHash, key 
        } = data;

        console.log(`[PayU Callback] Processing Txn: ${txnid}, Status: ${status}, Plan: ${plan_id}, UserUDF: ${udf1}`);

        // --- 1. VERIFY HASH ---
        const salt = process.env.PAYU_MERCHANT_SALT;
        const udf3 = data.udf3 || "";
        const udf4 = data.udf4 || "";
        const udf5 = data.udf5 || "";

        const hashString = `${salt}|${status}||||||${udf5}|${udf4}|${udf3}|${plan_id}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
        const calculatedHash = crypto.createHash('sha512').update(hashString).digest('hex');

        if (calculatedHash !== receivedHash) {
            console.error("[PayU Callback] Hash Mismatch!", { received: receivedHash, calculated: calculatedHash });
            return NextResponse.redirect(`${baseUrl}/plans?payment=tampered`, 303);
        }

        // --- AUDIT UPDATE ---
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Map PayU status to our Enum
        let finalStatus = 'failed';
        if (status === 'success') finalStatus = 'success';
        
        // Capture specific PayU error fields
        const errorMsg = data.error_Message || data.field9 || "Unknown Error";

        await supabaseAdmin
            .from('payment_transactions')
            .update({
                status: finalStatus,
                payu_mihpayid: data.mihpayid || null, // Proof of transaction
                error_message: status === 'failure' ? errorMsg : null,
                updated_at: new Date().toISOString()
            })
            .eq('txnid', txnid);

        if (status === 'success') {

            
            // --- 2. RESOLVE USER ID (FAILSAFE) ---
            let targetUserId = udf1;

            // If PayU dropped the UDF1 (happens in some test flows), lookup by email
            if (!targetUserId) {
                console.warn("[PayU Callback] UDF1 (UserID) missing. Attempting lookup by email...");
                // Note: We need to query the user by email using admin. 
                // However, auth.users isn't directly queryable via standard client unless mapped.
                // We will try to rely on the fact that we MUST have a user ID.
                // If this fails, we log a critical error.
                console.error("[PayU Callback] CRITICAL: No User ID provided in callback.");
                return NextResponse.redirect(`${baseUrl}/plans?payment=db_error_no_user`, 303);
            }

            // --- 3. UPDATE SUBSCRIPTION ---
            const durationDays = PLAN_DURATIONS[plan_id] || 0;
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(startDate.getDate() + durationDays);

            console.log(`[PayU Callback] Activating ${plan_id} for user ${targetUserId} until ${endDate.toISOString()}`);

            const { error } = await supabaseAdmin
                .from('user_subscriptions')
                .upsert({
                    user_id: targetUserId,
                    tier: plan_id,
                    status: 'active',
                    starts_at: startDate.toISOString(),
                    ends_at: endDate.toISOString(),
                    razorpay_order_id: txnid // Storing PayU Txn ID
                }, { onConflict: 'user_id' });

            if (error) {
                console.error("[PayU Callback] DB Update Failed:", error.message);
                return NextResponse.redirect(`${baseUrl}/plans?payment=db_error_write_failed`, 303);
            }

            return NextResponse.redirect(`${baseUrl}/dashboard?payment=success`, 303);
        } else {
            return NextResponse.redirect(`${baseUrl}/plans?payment=failed`, 303);
        }

    } catch (error) {
        console.error("[PayU Callback] Exception:", error);
        return NextResponse.redirect(`${baseUrl}/plans?payment=server_error`, 303);
    }
}