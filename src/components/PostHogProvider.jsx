// src/components/PostHogProvider.jsx
"use client";

import { useEffect } from 'react';
import posthog from 'posthog-js';
import { usePathname, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabaseClient';

// This is the main provider component
export function PostHogProvider({ children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize PostHog once on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        // This ensures page views are captured on route changes
        capture_pageview: false 
      });
    }

    // This is the CRITICAL part: linking PostHog to our Supabase auth.
    // It listens for any change in the user's login state.
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session && session.user) {
          // If a user logs in, we identify them to PostHog.
          // This connects all their future actions to their user ID.
          posthog.identify(
            session.user.id, {
              email: session.user.email,
            }
          );
        } else if (event === 'SIGNED_OUT') {
          // If a user logs out, we reset the PostHog identity.
          posthog.reset();
        }
      }
    );

    // Cleanup the listener when the component unmounts
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // This effect captures page views whenever the URL changes.
  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthog.capture(
        '$pageview',
        {
          '$current_url': url,
        }
      );
    }
  }, [pathname, searchParams]);


  return children;
}