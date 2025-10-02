// /src/app/api/onboarding/complete/route.js

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    // 1. Initialize the client designed specifically for Route Handlers.
    const supabase = createRouteHandlerClient({ cookies });

    try {
        // 2. Fetch the user session directly and robustly.
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            // If no session, the user is not logged in.
            return new Response(JSON.stringify({ error: 'Unauthorized: No active session.' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const user = session.user;

        // 3. Perform the update operation.
        const { data, error: updateError } = await supabase
            .from('profiles')
            .update({ has_completed_onboarding: true })
            .eq('id', user.id)
            .select() // This is still critical for verifying the update.
            .single(); // Use .single() to enforce that we expect exactly one row to be updated.

        if (updateError) {
            // This will now properly catch errors if the profile row does not exist.
            // A missing row with .single() will throw a PGRST116 error.
            console.error("Supabase update error:", updateError);
            throw new Error(`Database error: ${updateError.message}`);
        }

        // The .single() method ensures that if no row was updated (due to RLS or a missing profile),
        // it will be treated as an error and caught above. So we no longer need the `!data` check here.
        
        // 4. Respond with a success message.
        return new Response(JSON.stringify({ message: 'Onboarding status updated successfully.', updatedData: data }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Critical Error in /api/onboarding/complete:", error.message);
        return new Response(JSON.stringify({ error: 'Failed to update onboarding status.', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}