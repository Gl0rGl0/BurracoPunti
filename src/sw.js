const CACHE_NAME = 'burraco-cache-v1.0.0';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './styles.css',
  './xlsx.full.min.js',
  './app.js',
  './js/config.js',
  './js/utils.js',
  './js/engine.js',
  './js/storage.js',
  './js/excel.js',
  './css/base.css',
  './css/tables.css',
  './css/podium.css',
  './css/modals.css',
  './css/print.css',
  './img/icon.png',
  './img/pwa-192x192.png',
  './img/pwa-512x512.png',
  './img/pwa-maskable-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests and http/https scheme
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  // Network-first for navigation requests: pull latest version from Cloudflare when online,
  // fallback to cached index.html when offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // Stale-While-Revalidate for all assets: fast cached load with background sync
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
