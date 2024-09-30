/*const CACHE_NAME = 'notes_plus_plus_v2';
const VERSION_URL = '/app/version.txt'; // URL to latest version
const STATIC_ASSETS = [
    //'/',
    //'/index.html',
    '/app/app.main.html',
    '/root.css',
    '/app/main.css',
    '/app/pdf.handler.js',
    '/app/tools/viewport.helper.js',
    '/app/tools/selection.helper.js',
    '/app/tools/base.js',
    '/app/tools/pen.js',
    '/app/tools/highlighter.js',
    '/app/tools/eraser.js',
    //'/app/version.js',
    '/app/version.txt', // stores version
    // Offline page and external assets can be added if available
    //'/offline.html',
    // Local version of pdf.js instead of CDN to avoid CORS issues
    //'/app/libs/pdf.min.js'
];


// Installation: Cache all static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

// Fetch: Handle requests based on the network-first strategy
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).then(response => {
            // Check if the response is valid
            if (!response || response.status !== 200 || response.type !== 'basic') {
                // Fallback to cache if response is not valid
                return caches.match(event.request).then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Uncomment if offline.html is implemented
                    // else if (event.request.mode === 'navigate') {
                    //     return caches.match('/offline.html');
                    // }
                });
            }

            // Cache the valid response for future use
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseToCache);
            });

            return response;
        }).catch(() => {
            // Handle fetch error: fall back to cache
            return caches.match(event.request).then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                // Uncomment if offline.html is implemented
                // else if (event.request.mode === 'navigate') {
                //     return caches.match('/offline.html');
                // }
            });
        })
    );
});

// Message event handler for updating cache version
self.addEventListener('message', (event) => {
    if (!event.data) return;
    const { type, payload } = event.data;
    switch(type) {
        case "UPDATE VERSION": {
            event.waitUntil(
                caches.open(CACHE_NAME).then(async (cache) => {
                    try {
                        await cache.addAll(STATIC_ASSETS);
                        await cache.put(VERSION_URL, new Response(payload.version));

                        if (event.source && event.source.postMessage) {
                            event.source.postMessage({
                                type: "UPDATE COMPLETED",
                                payload: {
                                    version: payload.version
                                }
                            });
                        }
                    } catch (error) {
                        if (event.source && event.source.postMessage) {
                            event.source.postMessage({
                                type: "UPDATE_FAILED",
                                error: error.message
                            });
                        }
                    }
                })
            );
            break;
        }
        default:
            return;
    }
});
*/