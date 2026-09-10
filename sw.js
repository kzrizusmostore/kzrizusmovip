/* Service worker minimal KZRIZUSMO.
   Tujuannya cuma supaya syarat "installable" PWA terpenuhi di semua browser
   (Chrome/Edge/Android mewajibkan ada service worker aktif dengan fetch handler).
   Sengaja TIDAK melakukan caching agresif, supaya update konten (search, event,
   dsb yang selalu ambil data live dari API) tetap selalu fresh setiap dibuka. */

const SW_VERSION = 'kzrizusmo-v1';

self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

/* Fetch handler kosong (pass-through langsung ke network) - kehadirannya saja
   sudah cukup untuk memenuhi syarat installability, tanpa mengubah perilaku
   loading data/API yang sudah ada di aplikasi. */
self.addEventListener('fetch', function (event) {
  event.respondWith(fetch(event.request));
});
