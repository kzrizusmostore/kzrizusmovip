/* ZUSMO service worker — push notification (v11)
   Jika sw.js lama kamu sudah menangani push dengan field title/body/route, tidak perlu diganti. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; }
  catch (e) { d = { body: event.data ? event.data.text() : '' }; }

  const title = String(d.title || 'ZUSMO').slice(0, 80);
  const options = {
    body: String(d.body || '').slice(0, 200),
    tag: d.tag || 'zusmo',
    renotify: true,
    data: { route: d.route || '' },
  };
  if (d.icon) options.icon = d.icon;
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const route = (event.notification.data && event.notification.data.route) || '';
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      if (new URL(c.url).origin === self.location.origin) {
        await c.focus();
        if (route) c.postMessage({ type: 'zpush-open', route });
        return;
      }
    }
    await self.clients.openWindow(route ? '/?zpush=' + encodeURIComponent(route) : '/');
  })());
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    list.forEach((c) => c.postMessage({ type: 'zpush-resubscribe' }));
  })());
});
