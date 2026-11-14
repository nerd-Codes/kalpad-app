'use client';
import { useEffect } from 'react';

export default function ServiceWorkerRegistry() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '[::1]';

    // Never leave a caching service worker active in development or on localhost,
    // so dev/local rebuilds never serve stale chunks in desktop browsers.
    if (process.env.NODE_ENV !== 'production' || isLocalhost) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((reg) => reg.unregister())))
        .catch(() => {});

      if ('caches' in window) {
        caches
          .keys()
          .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
          .catch(() => {});
      }
      return;
    }

    if (window.workbox === undefined) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/app' })
        .catch((error) => {
          console.error('KalPad Service Worker registration failed:', error);
        });
    }
  }, []);

  return null;
}
