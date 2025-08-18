// src/components/PostHogProvider.jsx
"use client";

import { useEffect, Suspense } from 'react'; // --- MODIFICATION: ADD `Suspense`
import posthog from 'posthog-js';
// --- MODIFICATION: REMOVE `usePathname` and `useSearchParams` as they are no longer needed here ---
import supabase from '@/lib/supabaseClient';
// --- MODIFICATION: IMPORT THE NEW PAGEVIEW TRACKER ---
import { PostHogPageviewTracker } from './PostHogPageviewTracker';

export function PostHogProvider({ children }) {
  // --- MODIFICATION: The `pathname` and `searchParams` hooks are removed ---

  // This initialization effect remains unchanged.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        // We set capture_pageview to false because we are handling it manually in our new component.
        capture_pageview: false 
      });
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session && session.user) {
          posthog.identify(
            session.user.id, {
              email: session.user.email,
            }
          );
        } else if (event === 'SIGNED_OUT') {
          posthog.reset();
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // --- MODIFICATION: The problematic pageview useEffect has been DELETED from this file ---

  // --- MODIFICATION: We now return the children AND the new tracker wrapped in Suspense ---
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <PostHogPageviewTracker />
      </Suspense>
    </>
  );
}