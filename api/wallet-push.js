// Vercel Serverless Function: kirim Web Push saat withdraw diproses admin (paid / rejected).
// Tanpa dependency. Env yang dibutuhkan (pakai VAPID yang SAMA dengan push Live Chat):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...)
const crypto = require('crypto');
const b64u = (b) => Buffer.from(b).toString('base64url');
const unb64u = (s) => Buffer.from(s, 'base64url');
const hkdf = (salt, ikm, info, len) => Buffer.from(crypto.hkdfSync('sha256', ikm, salt, info, len));

function encrypt(sub, payload) { // RFC 8291 (aes128gcm)
  const ua = unb64u(sub.p256dh), auth = unb64u(sub.auth);
  const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
  const asPub = ecdh.getPublicKey();
  const prk = hkdf(auth, ecdh.computeSecret(ua), Buffer.concat([Buffer.from('WebPush: info\0'), ua, asPub]), 32);
  const salt = crypto.randomBytes(16);
  const cek = hkdf(salt, prk, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdf(salt, prk, Buffer.from('Content-Encoding: nonce\0'), 12);
  const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const ct = Buffer.concat([c.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([65]), asPub, ct]);
}

function vapidHeader(endpoint, pubB64, privB64, subject) { // RFC 8292
  const pub = unb64u(pubB64);
  const key = crypto.createPrivateKey({ key: { kty: 'EC', crv: 'P-256', d: privB64, x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) }, format: 'jwk' });
  const head = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const body = b64u(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject }));
  const sig = crypto.sign('sha256', Buffer.from(head + '.' + body), { key, dsaEncoding: 'ieee-p1363' });
  return 'vapid t=' + head + '.' + body + '.' + b64u(sig) + ', k=' + pubB64;
}

const rp = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');
const NAMES = { DANA: 'DANA', GOPAY: 'GoPay', SHOPEEPAY: 'ShopeePay', OVO: 'OVO' };

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const E = process.env, U = E.SUPABASE_URL, K = E.SUPABASE_SERVICE_ROLE_KEY;
  if (!U || !K || !E.VAPID_PUBLIC_KEY || !E.VAPID_PRIVATE_KEY) return res.status(500).json({ error: 'server_not_configured' });
  try {
    const tok = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const id = parseInt((req.body || {}).request_id, 10);
    if (!tok || !(id > 0)) return res.status(400).json({ error: 'bad_request' });
    const rest = (path, opt) => fetch(U + '/rest/v1/' + path, Object.assign({ headers: { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json', Prefer: 'return=representation' } }, opt));
    const J = async (path, opt) => { // error database dibuat jelas, bukan diam-diam
      const r = await rest(path, opt);
      const j = await r.json().catch(() => null);
      if (!r.ok) { const e = new Error('db'); e.detail = (j && (j.message || j.hint)) || String(r.status); throw e; }
      return j;
    };
    // 1) pemanggil harus admin
    const me = await fetch(U + '/auth/v1/user', { headers: { apikey: K, Authorization: 'Bearer ' + tok } });
    if (!me.ok) return res.status(401).json({ error: 'unauthorized' });
    const uid = (await me.json()).id;
    const adm = await J('wallet_admins?user_id=eq.' + encodeURIComponent(uid) + '&select=user_id');
    if (!adm.length) return res.status(403).json({ error: 'not_admin' });
    // 2) klaim sekali saja (anti notifikasi ganda); isi pesan murni dari database
    const cl = await J('withdraw_requests?id=eq.' + id + '&status=in.(paid,rejected)&notified_at=is.null', { method: 'PATCH', body: JSON.stringify({ notified_at: new Date().toISOString() }) });
    if (!cl.length) return res.status(200).json({ sent: 0, note: 'sudah dikirim atau belum diproses' });
    const w = cl[0], ew = NAMES[w.ewallet] || w.ewallet;
    const ok = w.status === 'paid';
    const msg = JSON.stringify({
      type: 'wallet', tag: 'wallet-' + id, url: '/',
      title: ok ? 'Withdraw berhasil' : 'Withdraw ditolak',
      body: ok ? rp(w.amount) + ' sudah dikirim ke ' + ew + '.' : rp(w.amount) + ' dikembalikan ke Saldo event.' + (w.admin_note ? ' Alasan: ' + String(w.admin_note).slice(0, 80) : '')
    });
    // 3) kirim ke semua perangkat user
    const subs = await J('wallet_push_subs?user_id=eq.' + w.user_id + '&select=id,endpoint,p256dh,auth');
    let sent = 0, retry = false;
    for (const s of subs) {
      try {
        const r = await fetch(s.endpoint, { method: 'POST', headers: { 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'high', Authorization: vapidHeader(s.endpoint, E.VAPID_PUBLIC_KEY, E.VAPID_PRIVATE_KEY, E.VAPID_SUBJECT || 'mailto:admin@localhost') }, body: encrypt(s, msg) });
        if (r.status >= 200 && r.status < 300) sent++;
        else if (r.status === 404 || r.status === 410) await rest('wallet_push_subs?id=eq.' + s.id, { method: 'DELETE' });
        else { retry = true; console.error('push gagal', r.status, await r.text().catch(() => '')); }
      } catch (e) { retry = true; console.error('push error', e && e.message); }
    }
    if (!sent) await rest('withdraw_requests?id=eq.' + id, { method: 'PATCH', body: JSON.stringify({ notified_at: null }) }); // boleh dicoba lagi
    return res.status(200).json({ sent, subs: subs.length });
  } catch (e) {
    console.error('wallet-push', e && (e.detail || e.message));
    return res.status(500).json({ error: 'server_error', detail: e && (e.detail || e.message) });
  }
};
module.exports._test = { encrypt, vapidHeader };
