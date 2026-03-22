# Acekallas Weather — Deploy Guide
> **AI assistants: read this file first before making any changes to this repo.**

## File Map

| File | Where it lives | What it does |
|------|---------------|--------------|
| `index.html` | GitHub Pages | Main app — the entire frontend |
| `sw.js` | GitHub Pages | Service worker — PWA caching |
| `pollen-test.html` | GitHub Pages | Pollen iframe page (PollenApps widget) |
| `manifest.json` | GitHub Pages | PWA manifest |
| `index_pollen-final.js` | **Cloudflare Worker** | Weather data API proxy (Tomorrow.io) |
| `index_pollen_proxy.js` | **Cloudflare Worker** | CORS proxy — separate, unrelated |

## Every Deploy — Required Steps

### 1. Bump the version comment in `index.html`
```html
<!-- Acekallas Weather & Allergy — v2.9 -->
```

### 2. Bump `CACHE_VERSION` in `sw.js`
```js
const CACHE_VERSION = 'v10'; // was v9
```
**This is non-negotiable.** Without this bump, iPhone users who added the
site to their home screen will keep seeing the old cached version. The
number just needs to change — increment by 1 each time.

### 3. If you changed `index_pollen-final.js` — deploy to Cloudflare
- Go to Cloudflare Dashboard → Workers & Pages → pollen-data worker
- Click **Edit Code**, paste the new file contents, click **Deploy**
- This file does NOT go to GitHub Pages

## Architecture

```
User's browser
    │
    ├── GitHub Pages (acekallas.com)
    │       index.html, sw.js, pollen-test.html, icons
    │
    ├── Cloudflare Worker (pollen-data.acekallas.com)
    │       index_pollen-final.js
    │       → calls Tomorrow.io API (env var: TOMORROW_API_KEY)
    │       → returns weather + hourly[12] + daily[5] + isRelay
    │       → 10-min cache, 429 on API limit
    │
    ├── api.weather.gov (NWS alerts — no key, called from browser)
    ├── api.zippopotam.us (zip lookup — no key)
    ├── nominatim.openstreetmap.org (reverse geocode — no key)
    ├── rainviewer.com (radar iframe — no key)
    └── PollenApps iframe (account 10757, via pollen-test.html)
```

## localStorage Keys (do not rename these)

| Key | Value | Purpose |
|-----|-------|---------|
| `lastLat` | float | Last known latitude |
| `lastLon` | float | Last known longitude |
| `lastZip` | string | Last zip code |
| `lastCity` | string | Last city name |
| `lastSource` | `'zip'` or `'gps'` | How location was last set |
| `theme` | `'dark'` or `'light'` | UI theme preference |
| `pollenLevel` | 0–4 | User-set pollen level |

**Critical:** `lastSource` controls whether `tryAutoGPS()` fires on page
load. If `lastSource === 'zip'`, GPS is suppressed so a manually entered
zip is not silently overridden on refresh.

## API Limit Handling

The Cloudflare Worker returns HTTP 429 when Tomorrow.io's free tier limit
is hit. `index.html` detects this via `!r.ok` (checks HTTP status, not
response body). On limit:
- Tomorrow.io cards are hidden (`display:none`)
- Sun schedule, radar, pollen widget, and NWS alerts keep working
- Auto-retries every 5 minutes

Do not change the error detection to check `d.error` — that causes false
positives on valid responses.

## iOS PWA Update Mechanism

When a user adds the site to their iPhone home screen, iOS serves cached
files via the service worker. Updates reach them via this chain:

1. `CACHE_VERSION` bumped in `sw.js` → browser detects new SW file
2. New SW installs → `self.skipWaiting()` fires immediately
3. New SW activates → `self.clients.claim()` takes over all tabs
4. `index.html` detects `controllerchange` event → `location.reload()`
5. User gets new version silently. No tap, no toast required.

**If you skip bumping `CACHE_VERSION`, step 1 never happens.**
