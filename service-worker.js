/* ============================================
   SERVICE WORKER - OFFLINE SUPPORT & CACHING
   ============================================ */

const CACHE_NAME = 'parallax-v3';
const CORE_FILES = ['/', '/index.html', '/css/styles.css', '/js/app.js', '/js/hero-carousel.js', '/js/supabase-client.js', '/js/grading-engine.js', '/manifest.json', '/offline.html'];

// ============================================
// INSTALL EVENT
// ============================================

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(CORE_FILES))
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
// FETCH EVENT — NETWORK-FIRST FOR APP CODE
// ============================================
// Cache-first was silently freezing every phone onto whatever version of
// index.html/css/js was cached on first visit, even after new deploys.
// Network-first means you always get the latest file when online, and
// only fall back to cache when offline.

self.addEventListener('fetch', event => {
    const { request } = event;

    if (!request.url.startsWith(self.location.origin)) {
        return;
    }

    if (request.url.includes('/api/')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    const clonedResponse = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clonedResponse));
                    return response;
                })
                .catch(() => caches.match(request).then(r => r || new Response('Offline', { status: 503 })))
        );
        return;
    }

    event.respondWith(
        fetch(request)
            .then(response => {
                if (!response || response.status !== 200 || response.type === 'error') {
                    return response;
                }
                const clonedResponse = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(request, clonedResponse));
                return response;
            })
            .catch(() => {
                return caches.match(request).then(cached => {
                    if (cached) return cached;
                    if (request.mode === 'navigate') return caches.match('/offline.html');
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
