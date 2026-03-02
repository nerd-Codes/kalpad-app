// src/app/api/auth-test/route.js
import { logRouteResult, resolveRouteAuth, unauthorizedResponse } from '@/lib/routeAuth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  let authMode = 'none';
  try {
    const auth = await resolveRouteAuth(request);
    authMode = auth.authMode;
    const { user } = auth;
    if (!user) {
      logRouteResult('/api/auth-test', authMode, 401);
      return unauthorizedResponse();
    }

    // If authentication is successful, return a success message
    logRouteResult('/api/auth-test', authMode, 200);
    return new Response(JSON.stringify({ 
        message: 'Authentication successful!',
        userId: user.id,
        email: user.email 
    }), { status: 200 });

  } catch (error) {
    console.error('Full error in auth-test API:', error);
    logRouteResult('/api/auth-test', authMode, 500);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
