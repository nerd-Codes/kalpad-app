// src/components/PostHogPageviewTracker.jsx
"use client";

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';

// This is a client-only component whose sole responsibility is to track page views.
export function PostHogPageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // This effect will run on initial load and every time the URL changes.
  useEffect(() => {
    if (pathname) {
      // We construct the full URL here
      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      
      // We send the pageview event to PostHog
      posthog.capture(
        '$pageview',
        {
          '$current_url': url,
        }
      );
    }
  }, [pathname, searchParams]); // The effect depends on the URL parts

  // This component renders nothing to the DOM
  return null;
}