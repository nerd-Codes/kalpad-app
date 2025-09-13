// src/app/api/timeline/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';

export const dynamic = 'force-dynamic';

// --- DEFINITIVE ADDITION #1: UNIVERSAL AUTH FUNCTION ---
// This reusable function handles authentication for both web (cookies) and native (JWT).
async function getAuthenticatedUser(request) {
    const supabase = createRouteHandlerClient({ cookies });
    let user;

    // Try to get user from the mobile app's JWT in the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const jwt = authHeader.replace('Bearer ', '');
        const { data } = await supabase.auth.getUser(jwt);
        user = data.user;
    }

    // If no JWT user, fall back to the web app's cookie session
    if (!user) {
        const { data: { session } } = await supabase.auth.getSession();
        user = session?.user;
    }
    
    return user;
}


export async function GET(request) {
  try {
    // 1. Authorize the user using our new universal function
    const user = await getAuthenticatedUser(request);
    if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // 2. Get the target date (Unchanged)
    const { searchParams } = new URL(request.url);
    const targetDate = searchParams.get('date');
    if (!targetDate) {
      return new Response(JSON.stringify({ error: 'Date parameter is required' }), { status: 400 });
    }

    // 3. Fetch the plan data (Unchanged)
    const supabase = createRouteHandlerClient({ cookies });
    const { data, error } = await supabase
      .from('study_plans')
      .select(`id, exam_name, exam_date, plan_topics!inner ( *, new_notes: generated_notes ( * ) )`)
      .eq('is_active', true)
      .eq('user_id', user.id)
      .eq('plan_topics.date', targetDate);

    if (error) throw new Error(error.message);

    // --- DEFINITIVE ADDITION #2: THE PROACTIVE TRIGGER LOGIC ---
    let triggerNativeAction = null;
    const userAgent = headers().get('user-agent') || '';

    // Check if the request is from our Android app AND if there are tasks for today.
    if (userAgent.includes('KalPad-Android-App') && data && data.length > 0) {
        const firstPlanForDay = data[0];
        const firstTopic = firstPlanForDay.plan_topics[0];
        const firstSubTopic = firstTopic.sub_topics[0];

        if (firstSubTopic) {
            // Set a reminder for 9 AM on the day of the task.
            const reminderDate = new Date(targetDate);
            reminderDate.setHours(9, 0, 0, 0);

            // Only set a reminder if it's in the future.
            if (reminderDate.getTime() > new Date().getTime()) {
                triggerNativeAction = {
                    type: "SET_REMINDER",
                    details: {
                        title: `Today's Mission: ${firstPlanForDay.exam_name}`,
                        message: `Your first task is: ${firstSubTopic.text}`,
                        timestamp: reminderDate.getTime(),
                    }
                };
            }
        }
    }

    // --- DEFINITIVE ADDITION #3: THE NEW RESPONSE STRUCTURE ---
    // We now wrap our response in an object to include the optional trigger.
    const responsePayload = {
        plans: data,
        triggerNativeAction: triggerNativeAction
    };
    
    return new Response(JSON.stringify(responsePayload), { status: 200 });

  } catch (error) {
    console.error('Full error in timeline API:', error);
    return new Response(JSON.stringify({ error: error.message || 'An internal error occurred.' }), { status: 500 });
  }
}