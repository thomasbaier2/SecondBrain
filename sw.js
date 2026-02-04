const CACHE_NAME = 'second-brain-v1';
const ASSETS = [
    './examples/standalone-example.html',
    './manifest.json',
    // Add other local assets if any
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (e) => {
    // Network-First for everything during development
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});
