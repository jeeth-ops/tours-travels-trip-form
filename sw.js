const CACHE_NAME = 'tours-portal-v2'; // Jab bhi bada update karein, isko v3, v4 kar dena
const ASSETS = [
  './',
  'index.html'
];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // Naye service worker ko bina wait kiye turant activate karega
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // Purane sabhi old caches ko automatic saaf kar dega
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
