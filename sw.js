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
  const url = new URL(e.request.url);

  // Never intercept cross-origin requests or non-GET — let them go straight to network
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Network-first for the weather worker API
  if (url.hostname.includes('pollen-data.acekallas.com')) {
    e.respondWith(
      fetch(e.request, { redirect: 'follow' })
        .then(res => {
          // Only cache valid, non-redirected same-origin responses
          if (res.ok && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for local static assets only
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request, { redirect: 'follow' }))
  );
});
