// Vercel serverless proxy untuk API NexaDev (menghindari blokir CORS di browser)
module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const id = String((req.query && req.query.id) || '').trim();
  if (!/^\d{5,15}$/.test(id)) return res.status(400).json({ ok: false, error: 'UID tidak valid' });
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch('https://api.nexadev.my.id/api/ff?id=' + encodeURIComponent(id), {
      headers: { Accept: 'application/json' },
      signal: ctl.signal
    });
    const txt = await r.text();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (r.ok) res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(r.status).send(txt);
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'Gagal menghubungi API NexaDev' });
  } finally {
    clearTimeout(timer);
  }
};
