const CACHE_NAME = 'acekallas-weather-v1';
const STATIC_ASSETS = ['/', '/index.html', '/pollen-test.html'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Network-first for API calls, cache-first for static assets
  const url = new URL(e.request.url);
  if (url.hostname.includes('acekallas.com') && url.pathname === '/') {
    // Worker API — network first, fall back to cache
    e.respondWith(
      fetch(e.request)
        .then(res => { const clone = res.clone(); caches.open(CACHE_NAME).then(c => c.put(e.request, clone)); return res; })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Static assets — cache first
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});
