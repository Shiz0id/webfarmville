// Meadowbrook's service worker: keeps the game itself on the device so it opens
// instantly (and while offline). Pages are fetched fresh when there's a
// connection; the hashed build files and fonts are kept once fetched. The farm
// server (/api) is never cached.
const CACHE = 'meadowbrook-v1';
const SHELL = ['./', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon-64.png'];

// The shell, plus the build files the page links to, so the very first visit is enough to play offline.
async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL);
  const html = await (await cache.match('./'))?.text();
  const assets = [...(html ?? '').matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+)"/g)].map((m) => m[1]);
  await cache.addAll(assets);
}

self.addEventListener('install', (e) => {
  e.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function fresh(req, fallback) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(fallback ?? req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(fallback ?? req);
    if (hit) return hit;
    throw err;
  }
}

async function kept(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (url.pathname.includes('/api/')) return;
    if (req.mode === 'navigate') return e.respondWith(fresh(req, new URL('./', self.registration.scope).href));
    if (url.pathname.includes('/assets/')) return e.respondWith(kept(req));
    return e.respondWith(fresh(req));
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') e.respondWith(kept(req));
});
