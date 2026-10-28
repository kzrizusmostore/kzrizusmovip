// Proxy Info Player Free Fire (Vercel serverless, simpan sebagai api/ff.js).
// Hanya memakai API siambhau69. API key tetap di server dan tidak ikut ke browser.
// Mengubah respons API ke format yang dipakai halaman: { ok, uid, profile:{...} }.
//
// Environment variable (opsional, disarankan diisi di dashboard Vercel):
//   FFINFO_KEY  = API key siambhau69
//   FFINFO_BASE = alamat API (default: http://siambhau69.eu.cc)
const BASE = String(process.env.FFINFO_BASE || 'http://siambhau69.eu.cc').replace(/\/+$/, '');
const KEY = process.env.FFINFO_KEY || 'kzrizusmo:FFINFO:XDI';
const REGIONS = ['ID', 'SG', 'BD', 'IND', 'TH', 'VN'];

// Setiap panggilan ke API memakai kuota harian, jadi hasil disimpan sementara.
const regionCache = new Map();   // uid -> region yang berhasil
const missCache = new Map();     // uid -> waktu terakhir tidak ditemukan
const MISS_TTL = 10 * 60 * 1000;

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : undefined; }
function icon(id) { return id ? { id: Number(id) } : null; }
function iso(sec) { const n = Number(sec); return n > 0 ? new Date(n * 1000).toISOString() : undefined; }
function dateText(sec, withTime) {
  const n = Number(sec); if (!(n > 0)) return undefined;
  const d = new Date(n * 1000);
  let t = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  if (withTime) t += ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).replace(':', '.') + ' WIB';
  return t;
}
function age(sec) {
  const n = Number(sec); if (!(n > 0)) return {};
  const days = Math.floor((Date.now() - n * 1000) / 864e5);
  const y = Math.floor(days / 365), m = Math.floor((days % 365) / 30);
  return { accountAgeDays: days, accountAgeText: (y ? y + ' tahun ' : '') + m + ' bulan' };
}

function toProfile(j, uid, region) {
  const b = j.basicInfo || {}, pi = j.profileInfo || {}, cl = j.clanBasicInfo || {}, pt = j.petInfo || {};
  const so = j.socialInfo || {}, cs = j.creditScoreInfo || {}, dc = j.diamondCostRes || {};
  const prime = b.primeInfo && b.primeInfo.primeLevel ? Number(b.primeInfo.primeLevel) : undefined;
  const p = {
    uid: String(b.accountId || uid),
    nickname: b.nickname,
    level: num(b.level),
    exp: num(b.exp),
    region: b.region || region,
    server: b.region || region,
    releaseVersion: b.releaseVersion,
    seasonId: num(b.seasonId),
    accountType: num(b.accountType),
    likes: num(b.liked),
    prime: prime ? { level: prime } : undefined,
    ranks: {
      br: { points: num(b.rankingPoints), rankId: num(b.rank), maxRank: num(b.maxRank) },
      cs: { points: num(b.csRankingPoints), rankId: num(b.csRank), maxRank: num(b.csMaxRank) }
    },
    creditScore: cs.creditScore != null ? { value: num(cs.creditScore), rewardState: cs.rewardState } : undefined,
    signature: so.signature || '',
    clan: cl.clanId ? { id: String(cl.clanId), name: cl.clanName, level: num(cl.clanLevel), captainId: cl.captainId, memberNum: num(cl.memberNum), capacity: num(cl.capacity) } : null,
    pet: pt.id ? { id: pt.id, level: num(pt.level), exp: num(pt.exp), skinId: pt.skinId } : null,
    // Hanya ID. Gambar item dibangun oleh halaman dari ID ini.
    avatar: icon(pi.avatarId || b.headPic),
    assets: {
      avatar: icon(b.headPic), profileAvatar: icon(pi.avatarId), title: icon(b.title), pin: icon(b.pinId), banner: icon(b.bannerId),
      badge: b.badgeId ? { id: b.badgeId, count: num(b.badgeCnt) } : null,
      pet: icon(pt.skinId),
      clothes: (pi.clothes || []).map(icon).filter(Boolean),
      weaponSkins: (b.weaponSkinShows || []).map(icon).filter(Boolean)
    },
    skills: pi.equipedSkills || [],
    dates: Object.assign({
      createdAt: iso(b.createAt), createdAtText: dateText(b.createAt, false),
      lastLoginAt: iso(b.lastLoginAt), lastLoginAtText: dateText(b.lastLoginAt, true)
    }, age(b.createAt)),
    estimate: dc.diamondCost != null ? { diamonds: num(dc.diamondCost) } : undefined,
    social: { accountId: so.accountId, language: so.language, gender: so.gender, rankShow: so.rankShow }
  };
  if (p.likes != null) p.likesText = p.likes.toLocaleString('id-ID');
  return p;
}

// Kesalahan yang menandakan masalah key/kuota (bukan UID salah): jangan lanjut coba region lain.
const SERVICE_ERR = /key|quota|kuota|limit|expire|unauthor|forbidden|suspend|inactive/i;

async function ask(uid, region) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  try {
    const url = BASE + '/freefireinfo/bhau?uid=' + encodeURIComponent(uid) + '&region=' + encodeURIComponent(region) + '&key=' + encodeURIComponent(KEY);
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctl.signal });
    const t = await r.text();
    let j; try { j = JSON.parse(t); } catch (e) { return { err: 'Respons server data Free Fire bukan JSON (HTTP ' + r.status + ').', net: true }; }
    if (j && j.basicInfo && j.basicInfo.nickname) return { j };
    const msg = String((j && (j.error || j.message)) || 'Tidak ditemukan');
    if (r.status === 401 || r.status === 403 || r.status === 429 || SERVICE_ERR.test(msg)) {
      return { err: 'Layanan data Free Fire sedang tidak tersedia atau kuota harian habis. Coba lagi nanti.', service: true, status: r.status === 429 ? 429 : 503 };
    }
    return { err: msg, notFound: true };
  } catch (e) {
    return { err: 'Gagal menghubungi server data Free Fire.', net: true };
  } finally { clearTimeout(timer); }
}

module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const q = req.query || {};
  const uid = String(q.id || q.uid || '').trim();
  if (!/^\d{5,15}$/.test(uid)) return res.status(400).json({ ok: false, error: 'UID tidak valid' });

  const miss = missCache.get(uid);
  if (miss && Date.now() - miss < MISS_TTL) return res.status(404).json({ ok: false, error: 'UID Free Fire tidak ditemukan.' });

  const want = String(q.region || '').toUpperCase();
  const order = [].concat(want ? [want] : [], regionCache.has(uid) ? [regionCache.get(uid)] : [], REGIONS)
    .filter((r, i, a) => /^[A-Z]{2,4}$/.test(r) && a.indexOf(r) === i);

  let last = null;
  for (const region of order) {
    const r = await ask(uid, region);
    if (r.j) {
      regionCache.set(uid, region);
      missCache.delete(uid);
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
      return res.status(200).json({ ok: true, uid, source: 'siambhau', profile: toProfile(r.j, uid, region) });
    }
    last = r;
    if (r.net || r.service) break;
  }
  if (last && (last.net || last.service)) {
    return res.status(last.service ? last.status : 502).json({ ok: false, error: last.err });
  }
  missCache.set(uid, Date.now());
  return res.status(404).json({ ok: false, error: 'UID Free Fire tidak ditemukan.' });
};
module.exports.toProfile = toProfile;
