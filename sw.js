// ── Acekallas Weather — Service Worker ────────────────────────────────────────
// IMPORTANT: Bump CACHE_VERSION with every deploy.
// This is the only thing you need to change — everything else is automatic.
// v2.8 → v2.9 deploy = change 'v9' to 'v10', save, push. Done.
const CACHE_VERSION = 'v9';
const CACHE_NAME    = `acekallas-weather-${CACHE_VERSION}`;

// Static assets to pre-cache (icons, manifest — rarely change)
const PRECACHE_ASSETS = [
  'favicon.ico',
  'favicon-32x32.png',
  'favicon-16x16.png',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'manifest.json'
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .catch(() => {})
  );
  // Skip waiting immediately — don't hold back for old SW to finish
  // This is critical for iOS: without this, the old version can persist
  // across multiple visits before the new one takes over
  self.skipWaiting();
});

// ── Activate: delete all old caches, claim all clients immediately ────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k.startsWith('acekallas-weather-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim()) // take control of every open tab now
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Only handle same-origin GET
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Never intercept pollen widget (third-party iframes with redirects)
  if (url.pathname.startsWith('/pollen-test')) return;

  // Never intercept manifest or icons handled by precache
  if (url.pathname.includes('manifest') || url.pathname.includes('icon-')) return;

  // ── HTML: network-first ───────────────────────────────────────────────────
  // Always fetch fresh HTML so PWA users get new versions on next open.
  // Only falls back to cache if genuinely offline.
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })  // no-store = bypass HTTP cache too
        .then(res => {
          if (res.ok) {
            caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(e.request)) // offline fallback only
    );
    return;
  }

  // ── Everything else: cache-first ─────────────────────────────────────────
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request, { redirect: 'follow' }).then(res => {
        if (res.ok && res.type === 'basic') {
          caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
        }
        return res;
      });
    })
  );
});

// ── Message handler ───────────────────────────────────────────────────────────
// Page sends 'skipWaiting' when it detects a new SW is installed
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
