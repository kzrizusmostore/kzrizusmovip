/* ZUSMO service worker — Web Push. No cache/fetch handler; existing site caching behavior remains unchanged. */
self.addEventListener('install', function (event) { self.skipWaiting(); });
self.addEventListener('activate', function (event) { event.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (event) {
  var d = {};
  try { d = event.data ? event.data.json() : {}; }
  catch (_) { d = { title: 'Zusmo', body: 'Pesan baru' }; }

  event.waitUntil((async function () {
    var title = String(d.title || 'Zusmo').slice(0, 120);
    var body = String(d.body || 'Ada pesan baru').slice(0, 240);
    var icon = '/zusmo-asset/icon-192.png';
    var badge = '/zusmo-asset/icon-192.png';
    try { if (typeof d.icon === 'string' && new URL(d.icon, self.location.origin).origin === self.location.origin) icon = new URL(d.icon, self.location.origin).href; } catch (_) {}
    try { if (typeof d.badge === 'string' && new URL(d.badge, self.location.origin).origin === self.location.origin) badge = new URL(d.badge, self.location.origin).href; } catch (_) {}
    var target = '/';
    try {
      var u = new URL(typeof d.url === 'string' ? d.url : '/', self.location.origin);
      if (u.origin === self.location.origin) target = u.pathname + u.search + u.hash;
    } catch (_) {}
    await self.registration.showNotification(title, {
      body: body, icon: icon, badge: badge, tag: String(d.tag || 'zusmo').slice(0, 100),
      renotify: false, timestamp: Date.now(), data: { url: target }
    });
  })());
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var target = '/';
  var route = '';
  try {
    var u = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin);
    if (u.origin === self.location.origin) { target = u.pathname + u.search + u.hash; route = u.searchParams.get('zpush') || ''; }
  } catch (_) {}
  event.waitUntil((async function () {
    var cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (var i = 0; i < cs.length; i++) {
      try {
        if (new URL(cs[i].url).origin !== self.location.origin) continue;
        await cs[i].focus();
        cs[i].postMessage({ type: 'zpush-open', route: route });
        return;
      } catch (_) {}
    }
    await self.clients.openWindow(target);
  })());
});

/* Browser-managed subscription changed; an open page can re-save its current subscription. */
self.addEventListener('pushsubscriptionchange', function (event) {
  event.waitUntil((async function () {
    var cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    cs.forEach(function (c) { c.postMessage({ type: 'zpush-resubscribe' }); });
  })());
});
