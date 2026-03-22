const CACHE_NAME = 'minesweeper-cache-v3';

const FILES_TO_CACHE = [
    './index.html',
    './style.css',
    './main.js',
    './manifest.json',
    './service-worker.js'
];

self.addEventListener('install', (event) => {
    // Force this SW to become active immediately, bypassing waiting
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(FILES_TO_CACHE);
        }).catch(error => {
            console.error('Caching failed:', error);
        })
    );
});

self.addEventListener('activate', (event) => {
    // Delete all old caches that don't match current version
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => {
                        console.log('Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        }).catch(error => {
            console.error('Fetching failed:', error);
        })
    );
});
