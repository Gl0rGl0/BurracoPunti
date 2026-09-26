const CACHE_NAME = 'burraco-cache-v1.2.7';

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
    caches.open(CACHE_NAME).then(async (cache) => {
      // Salva tutte le risorse individualmente per tolleranza ad errori di rete
      await Promise.all(
        ASSETS_TO_CACHE.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'reload' });
            if (res && (res.ok || res.type === 'opaque')) {
              await cache.put(url, res);
            }
          } catch (err) {
            console.warn('Burraco PWA: impossibile pre-caricare ' + url, err);
          }
        })
      );
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
  // Gestisci solo richieste GET con protocollo http o https
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  // 1. Richieste di navigazione (HTML principale)
  // Online: scarica la versione più recente. Offline: usa index.html memorizzato in cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(event.request, { ignoreSearch: true });
          if (cached) return cached;
          const indexCached = await caches.match('./index.html', { ignoreSearch: true });
          if (indexCached) return indexCached;
          return await caches.match('./', { ignoreSearch: true });
        })
    );
    return;
  }

  // 2. Risorse statiche (CSS, JS, immagini, font, libreria XLSX)
  // Strategia Cache-First: restituisce istantaneamente la versione in cache (indispensabile per funzionare offline senza connessione).
  // Se la connessione è attiva, sincronizza in background per la sessione successiva.
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        if (navigator.onLine) {
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const copy = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
              }
            })
            .catch(() => {});
        }
        return cachedResponse;
      }

      // Se non in cache, prova dalla rete e memorizza
      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Fallback offline di sicurezza: prova il match ignorando query string
          const fallback = await caches.match(event.request, { ignoreSearch: true });
          if (fallback) return fallback;
          return new Response('Risorsa non disponibile offline', { status: 503, statusText: 'Offline Unavailable' });
        });
    })
  );
});
