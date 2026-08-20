// Jab bhi bada update karein, VERSION ko badha dena (v14, v15...) - purana cache automatic saaf ho jaayega.
// v14 = smarter caching: ab CDN libraries (Chart.js, jsPDF, FontAwesome) aur icons bhi cache hote hain,
// isliye app dobara kholne par almost turant khulti hai, offline par bhi kaam karti hai.
const VERSION = 'v14';
const SHELL_CACHE = 'tours-portal-shell-' + VERSION;
const RUNTIME_CACHE = 'tours-portal-runtime'; // CDN libraries - version badhne par bhi yeh cache bana rehta hai

// App shell: pehli install par turant cache ho jaata hai
const SHELL_ASSETS = [
  './',
  'index.html',
  'manifest.json',
  '192-192.png',
  '512-512.png'
];

// Live data / submissions is host se aate hain - inhe KABHI cache nahi karna (hamesha fresh data chahiye)
const NEVER_CACHE_HOST = 'script.google.com';

self.addEventListener('install', (e) => {
  self.skipWaiting(); // Naye service worker ko bina wait kiye turant activate karega
  e.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      // addAll ek bhi asset fail hone par pura reject kar deta hai, isliye har file individually try karte hain
      return Promise.all(
        SHELL_ASSETS.map((url) => cache.add(url).catch(() => {}))
      );
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Purane shell caches hata do, lekin RUNTIME_CACHE (CDN libs) ko chhed mat karo
          if (key !== SHELL_CACHE && key !== RUNTIME_CACHE) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: cache mein jo hai woh TURANT dikha do (fast!),
// saath hi background mein network se latest version fetch karke cache update kar do (agli baar ke liye)
function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then((cache) => {
    return cache.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => cachedResponse); // network fail ho to purana cache hi sahi

      return cachedResponse || networkFetch;
    });
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // POST/PUT waghera (form submit) ko Service Worker touch hi nahi karega - seedha network par jaayega
  if (req.method !== 'GET') return;

  // Live trip data (fetch/submit) hamesha fresh honi chahiye - kabhi cache se serve nahi karte
  if (url.hostname === NEVER_CACHE_HOST) return;

  const isSameOrigin = url.origin === self.location.origin;
  const cacheName = isSameOrigin ? SHELL_CACHE : RUNTIME_CACHE;

  e.respondWith(staleWhileRevalidate(req, cacheName));
});
