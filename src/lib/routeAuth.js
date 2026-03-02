import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export function isBearerRequest(request) {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  return Boolean(authHeader && authHeader.startsWith('Bearer '));
}

function getBearerToken(request) {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim();
}

function createJwtBoundSupabaseClient(jwt) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${jwt}`
        }
      }
    }
  );
}

export async function resolveRouteAuth(request, { allowGuest = false } = {}) {
  const jwt = getBearerToken(request);
  if (jwt) {
    const bearerSupabase = createJwtBoundSupabaseClient(jwt);
    const { data } = await bearerSupabase.auth.getUser();
    if (data?.user) {
      return {
        supabase: bearerSupabase,
        user: data.user,
        authMode: 'bearer',
        isGuest: false,
        isAuthenticated: true
      };
    }
  }

  const cookieSupabase = createRouteHandlerClient({ cookies });
  const { data: sessionData } = await cookieSupabase.auth.getSession();
  if (sessionData?.session?.user) {
    return {
      supabase: cookieSupabase,
      user: sessionData.session.user,
      authMode: 'cookie',
      isGuest: false,
      isAuthenticated: true
    };
  }

  if (allowGuest && request.headers.get('x-is-guest') === 'true') {
    return {
      supabase: cookieSupabase,
      user: null,
      authMode: 'guest',
      isGuest: true,
      isAuthenticated: false
    };
  }

  return {
    supabase: cookieSupabase,
    user: null,
    authMode: 'none',
    isGuest: false,
    isAuthenticated: false
  };
}

export function unauthorizedResponse() {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

export function logRouteResult(route, authMode, statusCode) {
  console.info(`[RouteAuth] route=${route} authMode=${authMode} status=${statusCode}`);
}
