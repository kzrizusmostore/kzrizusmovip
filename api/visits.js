// Proxy Visit Profile (Vercel serverless, simpan sebagai api/visits.js).
// Mencoba endpoint utama dulu, kalau gagal baru fallback ke endpoint kedua.
// Key tetap di server dan tidak ikut ke browser.
//
// Environment variable (opsional, disarankan diisi di dashboard Vercel):
//   VISITS_PRIMARY_BASE  = alamat API utama (default: https://refresh-jwt-tokens-1.vercel.app/visits)
//   VISITS_FALLBACK_BASE = alamat API cadangan (default: https://ff.ggbluewhale.store/api/visits)
//   VISITS_KEY            = key untuk API cadangan (default: kzrizusmo)
//
// Pemakaian dari client:
//   /api/visits?region=ID&uid=260190210

const PRIMARY_BASE = String(process.env.VISITS_PRIMARY_BASE || 'https://refresh-jwt-tokens-1.vercel.app/visits').replace(/\/+$/, '');
const FALLBACK_BASE = String(process.env.VISITS_FALLBACK_BASE || 'https://ff.ggbluewhale.store/api/visits').replace(/\/+$/, '');
const KEY = process.env.VISITS_KEY || 'kzrizusmo';

async function readBody(r) {
  const contentType = r.headers.get('content-type') || '';
  const isJson = contentType.indexOf('application/json') === 0;
  const body = isJson ? await r.json() : await r.text();
  return { isJson, body };
}

module.exports = async function handler(req, res) {
  const region = String(req.query.region || '').trim();
  const uid = String(req.query.uid || '').trim();

  if (!region || !/^\d{6,13}$/.test(uid)) {
    res.status(400).json({ ok: false, error: 'region dan uid (6-13 digit) wajib diisi' });
    return;
  }

  // 1) Endpoint utama: region di path, uid sebagai query (?uid=...).
  try {
    const url1 = `${PRIMARY_BASE}/${encodeURIComponent(region)}?uid=${encodeURIComponent(uid)}`;
    const r1 = await fetch(url1);
    if (r1.ok) {
      const { isJson, body } = await readBody(r1);
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json(isJson ? Object.assign({ ok: true, source: 'primary' }, body) : { ok: true, source: 'primary', raw: String(body).slice(0, 500) });
      return;
    }
  } catch (e) {
    // lanjut ke fallback
  }

  // 2) Fallback: ff.ggbluewhale.store (butuh key).
  try {
    const qs = new URLSearchParams({ region, uid, key: KEY });
    const url2 = `${FALLBACK_BASE}?${qs.toString()}`;
    const r2 = await fetch(url2);
    const { isJson, body } = await readBody(r2);

    if (!r2.ok) {
      res.status(r2.status).json({ ok: false, error: 'Kedua endpoint gagal (' + r2.status + ')', detail: isJson ? body : String(body).slice(0, 300) });
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(isJson ? Object.assign({ ok: true, source: 'fallback' }, body) : { ok: true, source: 'fallback', raw: String(body).slice(0, 500) });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Proxy error: ' + (err && err.message ? err.message : 'unknown') });
  }
};
