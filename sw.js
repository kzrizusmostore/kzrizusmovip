/* ZUSMO service worker — push notification (v12)
   Letakkan di root situs (sejajar index.html).
   Jika sw.js lama kamu punya logika lain (cache, dsb.), gabungkan; bagian penting: push + notificationclick. */
const ICON = '/zusmo-asset/icon-192.png';
const BADGE = '/zusmo-asset/badge-96.png'; // PNG monokrom transparan 96x96 (pengganti huruf "W")

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; }
  catch (e) { d = { body: event.data ? event.data.text() : '' }; }

  const title = String(d.title || 'ZUSMO').slice(0, 80);
  const options = {
    body: String(d.body || '').slice(0, 200),
    icon: d.icon || ICON,
    badge: d.badge || BADGE,
    tag: d.tag || 'zusmo',
    renotify: true,
    data: { route: String(d.route || '') },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

function safeHttps(u) {
  try { const x = new URL(u); return x.protocol === 'https:' ? x.href : ''; } catch (e) { return ''; }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const route = (event.notification.data && event.notification.data.route) || '';
  event.waitUntil((async () => {
    // Link luar: buka langsung
    if (route.indexOf('url:') === 0) {
      const href = safeHttps(route.slice(4));
      if (href) { await self.clients.openWindow(href); return; }
    }
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      if (new URL(c.url).origin === self.location.origin) {
        await c.focus();
        if (route && route.indexOf('url:') !== 0) c.postMessage({ type: 'zpush-open', route });
        return;
      }
    }
    const open = route && route.indexOf('url:') !== 0 ? '/?zpush=' + encodeURIComponent(route) : '/';
    await self.clients.openWindow(open);
  })());
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    list.forEach((c) => c.postMessage({ type: 'zpush-resubscribe' }));
  })());
});
