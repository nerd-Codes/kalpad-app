// src/app/api/auth-test/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

async function getUserByJwt(supabase, authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(jwt);
    return user;
}

export async function GET(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    let user;

    // First, try to get user from the mobile app's JWT
    const authHeader = request.headers.get('Authorization');
    user = await getUserByJwt(supabase, authHeader);

    // If no JWT user, fall back to the web app's cookie session
    if (!user) {
        const { data: { session } } = await supabase.auth.getSession();
        user = session?.user;
    }

    // If still no user, deny access
    if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // If authentication is successful, return a success message
    return new Response(JSON.stringify({ 
        message: 'Authentication successful!',
        userId: user.id,
        email: user.email 
    }), { status: 200 });

  } catch (error) {
    console.error('Full error in auth-test API:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}