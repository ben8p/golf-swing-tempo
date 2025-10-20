// sw.js - Service Worker for Golf Swing Tempo PWA
const BASE_URL = self.registration.scope;
const BASE_FILE = `${BASE_URL}index.html`;
const CACHE_NAME = "golf-tempo-v1";
const urlsToCache = [
    `${BASE_URL}`,
    BASE_FILE,
    `${BASE_URL}manifest.json`,
    `${BASE_URL}icon-192.png`,
    `${BASE_URL}long_game/30-10-45bpm.mp3`,
    `${BASE_URL}long_game/27-9-50bpm.mp3`,
    `${BASE_URL}long_game/24-8-56bpm.mp3`,
    `${BASE_URL}long_game/21-7-64bpm.mp3`,
    `${BASE_URL}long_game/18-6-75bpm.mp3`,
    `${BASE_URL}long_game/15-5-90bpm.mp3`,
    `${BASE_URL}short_game/20-10-60bpm.mp3`,
    `${BASE_URL}short_game/18-9-67bpm.mp3`,
    `${BASE_URL}short_game/16-8-75bpm.mp3`,
    `${BASE_URL}short_game/14-7-86bpm.mp3`,
    `${BASE_URL}short_game/12-6-100bpm.mp3`,
    `${BASE_URL}short_game/10-5-120bpm.mp3`,
];
// Install Service Worker and cache assets
self.addEventListener("install", (event) => {
    console.log("Service Worker installing...");
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("Caching app shell and audio files");
            return cache
                .addAll(urlsToCache)
                .then(() => {
                    console.log("All files cached successfully");
                })
                .catch((err) => {
                    console.warn("Some files could not be cached:", err);
                    // Continue anyway - files may not all exist yet
                    return Promise.resolve();
                });
        })
    );
    self.skipWaiting();
});

// Activate Service Worker and clean up old caches
self.addEventListener("activate", (event) => {
    console.log("Service Worker activating...");
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log("Deleting old cache:", cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
    // Skip non-GET requests
    if (event.request.method !== "GET") {
        return;
    }

    const { request } = event;
    const url = new URL(request.url);

    // For audio files, use cache-first strategy with network fallback
    if (request.url.includes(".mp3")) {
        event.respondWith(
            caches.match(request.url).then((cachedResponse) => {
                if (cachedResponse) {
                    console.log("Serving from cache:", request.url);
                    return cachedResponse;
                }

                // Try network if not in cache
                return fetch(request, { credentials: "omit" })
                    .then((response) => {
                        if (
                            !response ||
                            response.status !== 200 ||
                            response.type === "error"
                        ) {
                            return response;
                        }

                        // Clone and cache successful responses
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request.url, responseToCache);
                        });

                        return response;
                    })
                    .catch((err) => {
                        console.error(
                            "Failed to fetch audio:",
                            request.url,
                            err
                        );
                        // Return the cached version if available, otherwise fail gracefully
                        return caches.match(request.url).then((cached) => {
                            if (cached) return cached;
                            // Return empty MP3 instead of error
                            return new Response(new ArrayBuffer(0), {
                                status: 200,
                                statusText: "OK",
                                headers: new Headers({
                                    "Content-Type": "audio/mpeg",
                                }),
                            });
                        });
                    });
            })
        );
        return;
    }

    // For all other requests, use network-first strategy
    event.respondWith(
        fetch(request)
            .then((response) => {
                if (
                    !response ||
                    response.status !== 200 ||
                    response.type === "error"
                ) {
                    return response;
                }

                // Clone the response
                const responseToCache = response.clone();

                // Cache successful responses
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request.url, responseToCache);
                });

                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(request.url).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    // Return offline page or default response
                    if (request.destination === "document") {
                        return caches.match(BASE_FILE);
                    }

                    return new Response("Offline - content not available", {
                        status: 503,
                        statusText: "Service Unavailable",
                        headers: new Headers({ "Content-Type": "text/plain" }),
                    });
                });
            })
    );
});
