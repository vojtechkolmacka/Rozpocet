// sw.js - Service Worker pro offline provoz PWA
const CACHE_NAME = 'kolobeznik-rozpocet-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './db.js',
  './initial-data.js',
  './budget.js',
  './debts.js',
  './receivables-goals.js',
  './backup.js',
  './manifest.json',
  './icon.svg'
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
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Vrátí soubor z cache, nebo zkusí síť
      return cachedResponse || fetch(event.request).catch(() => {
        // Pokud jsme offline a jde o navigaci, vrátíme index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
