// public/service-worker.js

const CACHE_NAME = 'kalpad-cache-v1';

// 1. INSTALL: Force the SW to take control immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting(); // Activate immediately, don't wait for tabs to close
});

// 2. ACTIVATE: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Take control of all clients immediately
});

// 3. FETCH: The Core "Stale-While-Revalidate" Logic
self.addEventListener('fetch', (event) => {
  // Ignore non-GET requests (like API POSTs) and Google Auth
  if (event.request.method !== 'GET' || event.request.url.includes('google')) {
    return;
  }

  event.respondWith(
    (async () => {
      // A. Try Network First
      try {
        const networkResponse = await fetch(event.request);
        
        // If valid, clone and cache it for next time
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      } catch (error) {
        // B. Network Failed? Try Cache
        console.log('[SW] Network failed. Checking cache for:', event.request.url);
        const cachedResponse = await caches.match(event.request);
        
        if (cachedResponse) {
          return cachedResponse;
        }

        // C. If not in cache and it's a page navigation, show Offline Page
        // (Optional: You can redirect to /offline here)
        return new Response('<h1>You are offline</h1><p>And this page is not cached.</p>', {
            headers: { 'Content-Type': 'text/html' }
        });
      }
    })()
  );
});