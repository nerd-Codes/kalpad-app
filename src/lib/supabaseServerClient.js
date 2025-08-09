// src/lib/supabaseServerClient.js

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  
  // --- THIS IS THE DEFINITIVE FIX ---
  // We check if the app is running in development mode on localhost.
  const isDevelopment = process.env.NODE_ENV === 'development';

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // This can be ignored
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // This can be ignored
          }
        },
      },
      // --- THIS BLOCK IS THE CRITICAL ADDITION ---
      cookieOptions: {
        // On Vercel, the domain is automatically handled.
        // On localhost, we must explicitly set the domain to an empty string
        // and disable the 'secure' flag for the cookie to be accepted.
        domain: isDevelopment ? '' : undefined,
        secure: !isDevelopment,
      },
      // ------------------------------------------
    }
  );
}