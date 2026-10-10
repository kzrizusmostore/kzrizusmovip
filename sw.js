/* KZRIZUSMO FF — service worker (v9)
   Taruh di ROOT situs (sejajar index.html) agar scope "/" berlaku. */
const VERSION = 'v9';
const SHELL_CACHE = 'kz-shell-' + VERSION;
const ASSET_CACHE = 'kz-assets-' + VERSION;
const SHELL = ['/', '/manifest.webmanifest', '/zusmo-asset/icon-192.png', '/zusmo-asset/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // satu per satu: kalau ada yang gagal, install tetap lanjut
    await Promise.all(SHELL.map((u) => cache.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = [SHELL_CACHE, ASSET_CACHE];
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('kz-') && !keep.includes(n)).map((n) => caches.delete(n)));
    if (self.registration.navigationPreload) { try { await self.registration.navigationPreload.enable(); } catch (e) {} }
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // API / CDN luar: biarkan browser
  if (req.headers.has('range')) return;                     // video/audio streaming
  if (req.destination === 'video' || req.destination === 'audio') return;
  if (url.pathname === '/sw.js') return;

  // Halaman (navigasi): jaringan dulu, cadangan dari cache saat offline.
  // Halaman lain (mis. /html-asset/reseller.html) TIDAK dialihkan ke index.html.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const pre = await event.preloadResponse;
        const res = pre || await fetch(req);
        if (res && res.ok && (url.pathname === '/' || url.pathname === '/index.html')) {
          const c = await caches.open(SHELL_CACHE); c.put('/', res.clone());
        }
        return res;
      } catch (err) {
        const cached = await caches.match(req, { ignoreSearch: true }) ||
          (url.pathname === '/' || url.pathname === '/index.html' ? await caches.match('/') : null);
        return cached || new Response('<meta charset="utf-8"><body style="background:#000;color:#fff;font-family:sans-serif;text-align:center;padding:40px"><h2>Kamu sedang offline</h2><p>Sambungkan internet lalu muat ulang.</p>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }

  // Aset statis: pakai cache dulu, perbarui di belakang layar.
  if (/\.(png|jpe?g|webp|gif|svg|ico|css|js|woff2?|ttf)$/i.test(url.pathname) || url.pathname === '/manifest.webmanifest') {
    event.respondWith((async () => {
      const cache = await caches.open(ASSET_CACHE);
      const hit = await cache.match(req);
      const net = fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
      return hit || (await net) || Response.error();
    })());
  }
});
