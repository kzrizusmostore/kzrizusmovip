// Opsional: proxy server agar key tidak terlihat di browser.
// Simpan sebagai api/splash.js (Vercel). Halaman Splash otomatis mencoba /api/splash dulu.
module.exports = async (req, res) => {
  try {
    const key = process.env.SPLASH_KEY || 'kzrizusmo';
    const r = await fetch('https://splash.ff.ggbluewhale.store/api/ind?key=' + encodeURIComponent(key), { headers: { accept: 'application/json' } });
    if (!r.ok) return res.status(502).json({ error: 'upstream' });
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: 'upstream' });
  }
};
