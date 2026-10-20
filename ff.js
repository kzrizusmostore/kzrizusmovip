// Vercel Serverless Function: /api/ff?id=UID  ->  proxy ke NexaDev (bebas CORS, same-origin)
module.exports = async (req, res) => {
  const id = String((req.query && req.query.id) || "").trim();
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (!/^\d{5,15}$/.test(id)) return res.status(400).send(JSON.stringify({ ok: false, error: "UID tidak valid." }));
  try {
    const r = await fetch("https://api.nexadev.my.id/api/ff?id=" + encodeURIComponent(id), {
      headers: { Accept: "application/json" }, redirect: "follow"
    });
    const text = await r.text();
    res.setHeader("Cache-Control", r.ok ? "public, s-maxage=60, stale-while-revalidate=120" : "no-store");
    return res.status(r.status).send(text);
  } catch (e) {
    return res.status(502).send(JSON.stringify({ ok: false, error: "Server gagal menghubungi NexaDev." }));
  }
};
