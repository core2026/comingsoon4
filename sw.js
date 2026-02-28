const CACHE_NAME = 'acekallas-weather-v2';
const STATIC_ASSETS = ['/', '/index.html'];

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

  // Only handle same-origin GET requests
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Never intercept pollen widget — it loads third-party scripts that use redirects
  if (url.pathname.startsWith('/pollen-test')) return;

  // Never intercept manifest or icons — let them hit network normally
  if (url.pathname.includes('manifest') || url.pathname.includes('icon-')) return;

  // Cache-first for static assets (index.html, sw.js)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request, { redirect: 'follow' }).then(res => {
        // Only cache clean same-origin responses
        if (res.ok && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
