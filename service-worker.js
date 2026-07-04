/* ============================================
   SERVICE WORKER - OFFLINE SUPPORT & CACHING
   ============================================ */

const CACHE_NAME = 'parallax-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/app.js',
    '/manifest.json',
    '/offline.html'
];

// ============================================
// INSTALL EVENT
// ============================================

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

// ============================================
// ACTIVATE EVENT
// ============================================

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// ============================================
// FETCH EVENT - CACHE FIRST STRATEGY
// ============================================

self.addEventListener('fetch', event => {
    const { request } = event;

    // Skip cross-origin requests
    if (!request.url.startsWith(self.location.origin)) {
        return;
    }

    // Network first for API calls
    if (request.url.includes('/api/')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Clone the response
                    const clonedResponse = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, clonedResponse);
                    });
                    return response;
                })
                .catch(() => {
                    return caches.match(request)
                        .then(response => response || new Response('Offline', { status: 503 }));
                })
        );
        return;
    }

    // Cache first for static assets
    event.respondWith(
        caches.match(request)
            .then(response => {
                if (response) {
                    return response;
                }

                return fetch(request)
                    .then(response => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type === 'error') {
                            return response;
                        }

                        // Clone the response
                        const clonedResponse = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, clonedResponse);
                        });

                        return response;
                    })
                    .catch(() => {
                        // Return offline page for navigation requests
                        if (request.mode === 'navigate') {
                            return caches.match('/offline.html');
                        }
                        return new Response('Offline', { status: 503 });
                    });
            })
    );
});

// ============================================
// PUSH NOTIFICATION EVENT
// ============================================

self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'New notification',
        icon: '/assets/icon-192.png',
        badge: '/assets/badge-72.png',
        tag: 'parallax-notification',
        requireInteraction: false
    };

    event.waitUntil(
        self.registration.showNotification('Parallax', options)
    );
});

// ============================================
// NOTIFICATION CLICK EVENT
// ============================================

self.addEventListener('notificationclick', event => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // Check if app is already open
                for (let client of clientList) {
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open app if not already open
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});

// ============================================
// BACKGROUND SYNC EVENT (for offline queue)
// ============================================

self.addEventListener('sync', event => {
    if (event.tag === 'sync-data') {
        event.waitUntil(
            // Sync data with server
            fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            .then(response => response.json())
            .catch(err => console.log('Sync failed:', err))
        );
    }
});

// ============================================
// MESSAGE EVENT (for communication with clients)
// ============================================

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
