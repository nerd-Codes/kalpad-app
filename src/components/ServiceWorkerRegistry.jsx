'use client';
import { useEffect } from 'react';

export default function ServiceWorkerRegistry() {
  useEffect(() => {
    // Only register if in a browser and HTTPS (or localhost)
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator && 
      window.workbox === undefined // Avoid double registration if next-pwa works
    ) {
      const swUrl = '/sw.js';
      
      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log('✅ KalPad Service Worker Registered: ', registration);
        })
        .catch((error) => {
          console.error('❌ KalPad Service Worker Registration Failed: ', error);
        });
    }
  }, []);

  return null;
}