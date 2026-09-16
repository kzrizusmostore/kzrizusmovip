/* ============================================================
   SERVICE WORKER — KZRIZUSMO FF
   ============================================================
   TUJUAN:
   - Cache media (gambar/video/audio/font) biar loading instan &
     tetap bisa dibuka walau koneksi lemot/app ditutup total.
   - App shell (index.html, style.css, script.js) TIDAK di-cache-first
     supaya update dari GitHub SELALU kepakai begitu file baru
     di-deploy — ini yang paling sering bikin "update nyangkut di
     versi lama" kalau HTML/JS/CSS ikut di-cache-first juga.

   CARA UPDATE BENAR SETIAP KALI DEPLOY:
   1) Naikkan nilai CACHE_VERSION di bawah (misalnya tanggal/jam
      deploy, contoh: 'v2026-09-17-01'). WAJIB diubah tiap deploy,
      kalau tidak, browser akan anggap sw.js "sama" dan skip update.
   2) Upload ulang sw.js INI bareng index.html/style.css/script.js
      yang baru ke folder yang sama di hosting/GitHub.
   3) Selesai — script.js di app sudah otomatis: register ulang,
      cek update tiap app dibuka/fokus/tiap 10 menit, skipWaiting
      otomatis, lalu reload sekali biar user langsung dapet versi
      terbaru tanpa perlu clear cache manual.
   ============================================================ */

// PENTING: ganti/naikkan string ini SETIAP KALI kamu deploy versi baru.
// Kalau lupa diubah, browser akan mengira sw.js tidak berubah dan
// tidak akan ada update sama sekali walau isi file lain sudah beda.
const CACHE_VERSION = 'v2026-09-17-01';
const MEDIA_CACHE = 'zusmo-media-' + CACHE_VERSION;

// Ekstensi file yang dianggap "media" -> boleh di-cache-first (disimpan
// permanen di device, langsung dari cache kalau sudah pernah diambil).
const MEDIA_EXT = /\.(png|jpe?g|gif|webp|avif|svg|ico|mp4|webm|mp3|wav|ogg|m4a|woff2?|ttf|otf)(\?.*)?$/i;

// File app-shell yang TIDAK BOLEH cache-first (harus selalu dicoba ambil
// dari network dulu supaya update selalu kepakai).
const SHELL_EXT = /\.(html?|css|js)(\?.*)?$/i;

self.addEventListener('install', (event) => {
  // Langsung aktif tanpa nunggu tab lama ditutup, begitu ada versi baru
  // dan diberi sinyal SKIP_WAITING dari halaman (lihat listener 'message'
  // di bawah dan kode registrasi SW di script.js).
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Hapus semua cache versi lama biar tidak numpuk & tidak ada
      // kemungkinan file lama ke-serve lagi secara tidak sengaja.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('zusmo-media-') && k !== MEDIA_CACHE)
          .map((k) => caches.delete(k))
      );
      // Ambil alih semua tab yang sedang terbuka SEKARANG JUGA, tanpa
      // perlu reload manual/tutup-buka app dulu.
      await self.clients.claim();
    })()
  );
});

// Terima perintah "SKIP_WAITING" dari halaman (dikirim otomatis oleh
// script.js begitu ketemu SW baru yang sudah 'installed').
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Cuma tangani request ke origin sendiri (bukan CDN/API pihak ketiga)
  // supaya tidak nyangkut2 ke request lain yang memang harus selalu fresh
  // (API game, endpoint stok, dsb).
  if (url.origin !== self.location.origin) return;

  // App-shell (html/css/js): NETWORK-FIRST. Coba ambil versi terbaru dari
  // server dulu; kalau offline baru fallback ke cache (kalau ada). Ini
  // yang memastikan update dari GitHub selalu kepakai duluan.
  if (SHELL_EXT.test(url.pathname)) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          // Simpan salinan terbaru buat fallback offline, TIDAK dipakai
          // untuk menjawab request selama network masih hidup.
          const resClone = res.clone();
          caches.open(MEDIA_CACHE).then((c) => c.put(req, resClone)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Media (gambar/video/audio/font): CACHE-FIRST, sesuai tujuan awal SW
  // ini — instan dibuka & hemat kuota, karena media jarang berubah.
  if (MEDIA_EXT.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const resClone = res.clone();
          if (res.ok) {
            caches.open(MEDIA_CACHE).then((c) => c.put(req, resClone)).catch(() => {});
          }
          return res;
        });
      })
    );
    return;
  }

  // Selain itu (API call, dsb): biarkan lewat browser seperti biasa,
  // tidak dicampuri oleh service worker ini.
});
