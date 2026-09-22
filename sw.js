/**
 * TaskFlow - Progressive Web App Service Worker
 * Version: 1.0.0
 * Architecture: Stale-While-Revalidate with Pre-cached Shell & Offline Fallback
 */

const CACHE_NAME = 'taskflow-pwa-v1';

// Critical local app shell assets
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './css/custom.css',
  './js/storage.js',
  './js/ui.js',
  './js/app.js',
  './manifest.webmanifest',
  './manifest.json',
  './assets/favicon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-192.png',
  './assets/icon-maskable-512.png',
  './assets/apple-touch-icon.png',
  './assets/favicon-32x32.png',
  './assets/favicon-16x16.png'
];

// External CDN libraries essential for offline UI and styling
const CDN_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap'
];

/**
 * Service Worker Installation
 * Pre-caches the core application shell and CDN dependencies.
 */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Pre-cache local assets first
      try {
        await cache.addAll(PRECACHE_ASSETS);
      } catch (err) {
        console.warn('[ServiceWorker] Some local assets failed to precache:', err);
      }

      // Pre-cache CDN dependencies in background without blocking install
      CDN_ASSETS.forEach(async (url) => {
        try {
          const response = await fetch(url, { mode: 'cors' });
          if (response && response.ok) {
            await cache.put(url, response);
          }
        } catch {
          // If offline during install, will be fetched and cached later on demand
        }
      });
    })
  );
});

/**
 * Service Worker Activation
 * Cleans up old cache stores and claims all active clients immediately.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[ServiceWorker] Clearing obsolete cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/**
 * Fetch Event Handler
 * Stale-While-Revalidate strategy for static resources,
 * Network-First with Cache fallback for navigation requests.
 */
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. Navigation requests (HTML document loads)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Update cached index.html with fresh copy
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Fall back to cached app shell when offline
          const cachedShell = await caches.match('./index.html');
          if (cachedShell) return cachedShell;
          return caches.match('./');
        })
    );
    return;
  }

  // 2. Static Assets & CDN libraries: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Kick off background network fetch to revalidate
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failed, cache served if available
          return null;
        });

      // Return cached version if found, otherwise wait for network fetch
      return cachedResponse || fetchPromise.then((res) => {
        if (res) return res;
        // Generic fallback if both cache and network fail for images
        if (request.destination === 'image') {
          return caches.match('./assets/favicon.svg');
        }
      });
    })
  );
});

/**
 * Client Message Handler
 * Allows client applications to prompt skipWaiting upon update approval.
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
