// sw.js - Service Worker for Golf Swing Tempo PWA

const CACHE_NAME = 'golf-tempo-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  
  // Long Game audio files
  '/long_game/30-10-45bpm.mp3',
  '/long_game/27-9-50bpm.mp3',
  '/long_game/24-8-56bpm.mp3',
  '/long_game/21-7-64bpm.mp3',
  '/long_game/18-6-75bpm.mp3',
  '/long_game/15-5-90bpm.mp3',
  
  // Short Game audio files
  '/short_game/20-10-60bpm.mp3',
  '/short_game/18-9-67bpm.mp3',
  '/short_game/16-8-75bpm.mp3',
  '/short_game/14-7-86bpm.mp3',
  '/short_game/12-6-100bpm.mp3',
  '/short_game/10-5-120bpm.mp3',
];

// Install Service Worker and cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching app shell and audio files');
      return cache.addAll(urlsToCache).catch((err) => {
        console.warn('Some files could not be cached:', err);
        // Continue anyway - some files might not exist yet
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate Service Worker and clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version if available
      if (response) {
        return response;
      }

      // Otherwise try to fetch from network
      return fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache successful responses for future offline use
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Network failed, serve from cache or offline page
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Optionally return a custom offline page here
            return new Response('Offline - content not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({ 'Content-Type': 'text/plain' }),
            });
          });
        });
    })
  );
});
