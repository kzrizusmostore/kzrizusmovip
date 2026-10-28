// Proxy Info Player Free Fire (Vercel serverless).
// Memanggil API siambhau69 dari server (API key tidak ikut ke browser) lalu
// mengubah responsnya ke format yang dipakai halaman: { ok, uid, profile:{...} }.
const BASE = 'http://siambhau69.eu.cc';
const KEY = process.env.FFINFO_KEY || 'kzrizusmo:FFINFO:XDI';
const REGIONS = ['ID', 'SG', 'BD', 'IND', 'TH', 'VN'];
const ICON = 'https://adenpedia.my.id/update01/images/avatar/';
const regionCache = new Map();

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : undefined; }
function icon(id) { return id ? { id: Number(id), url: ICON + id + '.png' } : null; }
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
    prime: prime ? { level: prime, image: 'https://adenpedia.my.id/update01/prime' + prime + '.png' } : undefined,
    ranks: {
      br: { points: num(b.rankingPoints), rankId: num(b.rank), maxRank: num(b.maxRank) },
      cs: { points: num(b.csRankingPoints), rankId: num(b.csRank), maxRank: num(b.csMaxRank) }
    },
    creditScore: cs.creditScore != null ? { value: num(cs.creditScore), rewardState: cs.rewardState } : undefined,
    signature: so.signature || '',
    clan: cl.clanId ? { id: String(cl.clanId), name: cl.clanName, level: num(cl.clanLevel), captainId: cl.captainId, memberNum: num(cl.memberNum), capacity: num(cl.capacity) } : null,
    pet: pt.id ? { id: pt.id, level: num(pt.level), exp: num(pt.exp), skinId: pt.skinId } : null,
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

async function ask(uid, region) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  try {
    const url = BASE + '/freefireinfo/bhau?uid=' + encodeURIComponent(uid) + '&region=' + region + '&key=' + encodeURIComponent(KEY);
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctl.signal });
    const t = await r.text();
    let j; try { j = JSON.parse(t); } catch (e) { return { err: 'Respons server bukan JSON (HTTP ' + r.status + ').' }; }
    if (j && j.basicInfo && j.basicInfo.nickname) return { j };
    return { err: String((j && (j.error || j.message)) || 'Tidak ditemukan'), notFound: true, status: r.status };
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
  const want = String(q.region || '').toUpperCase();
  const order = [].concat(want ? [want] : [], regionCache.has(uid) ? [regionCache.get(uid)] : [], REGIONS)
    .filter((r, i, a) => /^[A-Z]{2,4}$/.test(r) && a.indexOf(r) === i);
  let last = null;
  for (const region of order) {
    const r = await ask(uid, region);
    if (r.j) {
      regionCache.set(uid, region);
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
      return res.status(200).json({ ok: true, uid, source: 'siambhau', profile: toProfile(r.j, uid, region) });
    }
    last = r;
    if (r.net) break;
  }
  const msg = last && last.net ? last.err : 'UID Free Fire tidak ditemukan.';
  return res.status(last && last.net ? 502 : 404).json({ ok: false, error: msg });
};
module.exports.toProfile = toProfile;
