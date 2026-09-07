/* ============================================================
   ZUSMO — Service Worker: Cache Media Selamanya
   ============================================================
   Semua gambar, video, audio, dan font yang PERNAH dimuat akan
   disimpan permanen di Cache Storage milik browser. Kunjungan
   berikutnya (walau app ditutup total, dihapus dari recent apps,
   bahkan lagi offline) media itu langsung disajikan dari cache —
   0 request ke internet, 0 loading.

   File ini WAJIB ada di folder yang SAMA dengan index.html,
   karena browser cuma bisa "mengawasi" request dalam scope folder
   tempat sw.js ini berada.

   Kalau nanti mau paksa semua media di-download ulang (misal abis
   ganti ISI file gambar/video tapi nama filenya dibiarin sama),
   tinggal naikkan angka versi di CACHE_NAME di bawah ini.
   ============================================================ */

const CACHE_NAME = 'zusmo-media-v1';

// Ekstensi yang dianggap "media" & di-cache selamanya.
const MEDIA_EXT_RE = /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|mp4|webm|mov|m4v|mp3|wav|m4a|ogg|oga|weba|woff2?|ttf|otf)(\?.*)?$/i;

// "destination" bawaan browser — cara paling akurat buat nangkep
// SEMUA cara media dipanggil (dari <img>, css background-image,
// <video>, <audio>, @font-face, fetch(), dst), apa pun nama file
// atau ekstensinya.
const MEDIA_DESTINATIONS = new Set(['image', 'video', 'audio', 'font']);

function isMediaRequest(req) {
  if (req.method !== 'GET') return false;
  if (MEDIA_DESTINATIONS.has(req.destination)) return true;
  try {
    return MEDIA_EXT_RE.test(new URL(req.url).pathname);
  } catch (e) {
    return false;
  }
}

self.addEventListener('install', function (event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (names) {
        return Promise.all(
          names.map(function (name) {
            if (name !== CACHE_NAME) return caches.delete(name);
          })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

// Motong 1 response utuh yang tersimpan di cache jadi potongan byte
// (206 Partial Content) sesuai header Range yang diminta browser.
// Ini yang bikin video/audio dari cache tetap bisa di-seek instan,
// bukan cuma bisa diputar dari awal doang.
async function servePartial(fullResponse, rangeHeader) {
  const buffer = await fullResponse.arrayBuffer();
  const size = buffer.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader || '');
  let start = 0, end = size - 1;

  if (m) {
    if (m[1] === '' && m[2] !== '') {
      // format "bytes=-500" -> 500 byte terakhir
      const suffixLen = parseInt(m[2], 10);
      start = Math.max(size - suffixLen, 0);
      end = size - 1;
    } else {
      if (m[1] !== '') start = parseInt(m[1], 10);
      if (m[2] !== '') end = parseInt(m[2], 10);
    }
  }
  if (isNaN(start) || start < 0) start = 0;
  if (isNaN(end) || end >= size) end = size - 1;

  if (start > end || start >= size) {
    return new Response(null, {
      status: 416,
      statusText: 'Range Not Satisfiable',
      headers: { 'Content-Range': 'bytes */' + size }
    });
  }

  const headers = new Headers(fullResponse.headers);
  headers.set('Content-Range', 'bytes ' + start + '-' + end + '/' + size);
  headers.set('Content-Length', String(end - start + 1));
  headers.set('Accept-Ranges', 'bytes');

  return new Response(buffer.slice(start, end + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers: headers
  });
}

self.addEventListener('fetch', function (event) {
  const request = event.request;
  if (!isMediaRequest(request)) return; // bukan media -> biarin browser handle kayak biasa

  event.respondWith((async function () {
    const cache = await caches.open(CACHE_NAME);
    // Key cache SELALU tanpa header Range, biar 1 file media = 1 entry
    // cache aja — gak peduli awalnya browser minta full atau sepotong.
    const cacheKey = new Request(request.url);
    const rangeHeader = request.headers.get('range');

    let full = await cache.match(cacheKey);

    if (!full) {
      try {
        const cleanHeaders = new Headers(request.headers);
        cleanHeaders.delete('range');
        const networkReq = new Request(request.url, {
          method: 'GET',
          headers: cleanHeaders,
          credentials: request.credentials,
          redirect: 'follow'
        });
        const response = await fetch(networkReq);
        if (response && (response.ok || response.type === 'opaque')) {
          cache.put(cacheKey, response.clone());
          full = response;
        } else {
          return response; // 404/500 dll -> jangan di-cache, balikin apa adanya
        }
      } catch (err) {
        // Offline & belum pernah ke-cache -> emang gak ada yang bisa disajikan.
        return new Response('', {
          status: 504,
          statusText: 'Offline, media belum pernah ke-cache'
        });
      }
    }

    if (rangeHeader && full.type !== 'opaque') {
      try {
        return await servePartial(full.clone(), rangeHeader);
      } catch (e) {
        return full; // fallback aman: balikin full response aja
      }
    }
    return full;
  })());
});
