/* sw.js */
const VERSION = 'v1.0.3';
const STATIC_CACHE = `static-${VERSION}`;
const HTML_CACHE = `html-${VERSION}`;
const OFFLINE_URL = '/offline.html';  // relative to SW scope

// Build absolute URLs relative to the SW scope (handles /repo/ on GH Pages)
const toAbs = (p) => new URL(p, self.registration.scope).toString();

const STATIC_ASSETS = [
  '/',                    // scope root (i.e., index.html)
  '/assets/css/style.css',
  OFFLINE_URL
].map(toAbs);

// -------- Install: pre-cache core assets, but don’t fail on one miss
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const results = await Promise.allSettled(STATIC_ASSETS.map(u => cache.add(u)));
    results.forEach((r, i) => {
      if (r.status === 'rejected') console.warn('[SW] Cache miss:', STATIC_ASSETS[i]);
    });
  })());
  self.skipWaiting();
});

// -------- Activate: clean old caches and take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([STATIC_CACHE, HTML_CACHE]);
    const keys = await caches.keys();
    await Promise.all(keys.map(k => keep.has(k) ? null : caches.delete(k)));
    await self.clients.claim();
  })());
});

// -------- Fetch: network-first for HTML, cache-first for static
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // Network-first for documents; fall back to cached/offline
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(HTML_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cacheMatch = await caches.match(req);
        return cacheMatch || caches.match(toAbs(OFFLINE_URL));
      }
    })());
    return;
  }

  // Static assets: cache-first
  if (['style', 'script', 'image', 'font'].includes(req.destination)) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      const cache = await caches.open(STATIC_CACHE);
      cache.put(req, res.clone());
      return res;
    })());
  }
});
