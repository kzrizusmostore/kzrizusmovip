/* KZRIZUSMO FF - service worker (syarat installable + fallback offline untuk halaman utama) */
const V = 'kz-pwa-v9';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then((c) => c.add('/')).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || r.headers.has('range')) return;       // video/audio & POST langsung ke jaringan
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;                   // API & CDN pihak lain tidak disentuh

  if (r.mode === 'navigate') {                                     // halaman: jaringan dulu, offline pakai cache
    e.respondWith(
      fetch(r)
        .then((res) => { const cp = res.clone(); caches.open(V).then((c) => c.put('/', cp)); return res; })
        .catch(() => caches.match('/'))
    );
    return;
  }

  e.respondWith(                                                   // aset: jaringan dulu, cadangan dari cache
    fetch(r)
      .then((res) => {
        if (res && res.ok && res.type === 'basic') { const cp = res.clone(); caches.open(V).then((c) => c.put(r, cp)); }
        return res;
      })
      .catch(() => caches.match(r))
  );
});
