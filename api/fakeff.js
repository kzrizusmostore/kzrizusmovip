// Proxy Fake FF HD (Vercel serverless, simpan sebagai api/fakeff.js).
// Memakai API apii.nexadev.my.id. Apikey tetap di server dan tidak ikut ke browser.
//
// Environment variable (opsional, disarankan diisi di dashboard Vercel):
//   FAKEFF_BASE   = alamat API (default: https://apii.nexadev.my.id)
//   FAKEFF_APIKEY = apikey (default: kzrizusmo)
//
// Pemakaian dari client:
//   /api/fakeff?mode=solo&usn=NamaNickname
//   /api/fakeff?mode=duo&nickname1=Nama1&nickname2=Nama2

const BASE = String(process.env.FAKEFF_BASE || 'https://apii.nexadev.my.id').replace(/\/+$/, '');
const APIKEY = process.env.FAKEFF_APIKEY || 'kzrizusmo';

module.exports = async function handler(req, res) {
  try {
    const mode = String(req.query.mode || 'solo').toLowerCase();

    let upstream;
    if (mode === 'duo') {
      const n1 = String(req.query.nickname1 || '').trim();
      const n2 = String(req.query.nickname2 || '').trim();
      if (!n1 || !n2) {
        res.status(400).json({ ok: false, error: 'nickname1 dan nickname2 wajib diisi' });
        return;
      }
      const qs = new URLSearchParams({ nickname1: n1, nickname2: n2, apikey: APIKEY });
      upstream = `${BASE}/fakeffduo?${qs.toString()}`;
    } else {
      const usn = String(req.query.usn || '').trim();
      if (!usn) {
        res.status(400).json({ ok: false, error: 'usn wajib diisi' });
        return;
      }
      const qs = new URLSearchParams({ usn, apikey: APIKEY });
      upstream = `${BASE}/fakeff?${qs.toString()}`;
    }

    const r = await fetch(upstream);
    const contentType = r.headers.get('content-type') || '';

    if (!r.ok) {
      res.status(r.status).json({ ok: false, error: 'Upstream API gagal (' + r.status + ')' });
      return;
    }

    if (contentType.indexOf('image/') !== 0) {
      // Upstream balas JSON (biasanya pesan error) alih-alih gambar.
      const text = await r.text();
      res.status(502).json({ ok: false, error: 'Upstream tidak mengembalikan gambar', detail: text.slice(0, 300) });
      return;
    }

    const arrayBuffer = await r.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(buffer);
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Proxy error: ' + (err && err.message ? err.message : 'unknown') });
  }
};
