/* Pembantu API: Redis REST (Upstash / Vercel KV), kunci admin, pembatas laju, sanitasi */
const crypto = require('crypto');
const BASE = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
exports.ok = !!(BASE && TOK);

exports.rc = async (...cmd) => {
  const r = await fetch(BASE, { method: 'POST', headers: { Authorization: 'Bearer ' + TOK, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
};
exports.send = (res, code, obj) => { res.setHeader('Cache-Control', 'no-store'); res.status(code).json(obj); };
exports.ip = req => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
exports.str = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n);
exports.url = v => { try { const u = new URL(String(v).trim()); return /^https?:$/.test(u.protocol) ? u.href.slice(0, 500) : ''; } catch { return ''; } };

/* true bila melewati batas */
exports.limit = async (name, max, sec) => {
  const k = 'ak:rl:' + name, n = await exports.rc('INCR', k);
  if (n === 1) await exports.rc('EXPIRE', k, sec);
  return n > max;
};

/* ---- sesi & peran: owner (kunci OWNER_KEY) dan admin (akun yang dibuat owner) ---- */
exports.ownerKey = () => process.env.OWNER_KEY || process.env.ADMIN_KEY || '';
const sha = t => crypto.createHash('sha256').update(String(t));
exports.eq = (a, b) => crypto.timingSafeEqual(sha(a).digest(), sha(b).digest());
exports.hash = t => sha(t).digest('hex');
exports.who = async req => {
  const m = /^Bearer ([0-9a-f]{64})$/.exec(req.headers.authorization || '');
  if (!m) return null;
  const raw = await exports.rc('GET', 'ak:ses:' + exports.hash(m[1]));
  let s; try { s = raw && JSON.parse(raw); } catch { s = null; }
  if (!s) return null;
  if (s.role === 'admin' && !(await exports.rc('HGET', 'ak:admins', s.e))) return null; // admin sudah dicopot
  return s;
};
/* min: 'admin' (admin atau owner) atau 'owner' (hanya owner). Mengembalikan sesi, atau null setelah membalas error. */
exports.gate = async (req, res, min = 'admin') => {
  const s = await exports.who(req);
  if (!s) { exports.send(res, 401, { error: 'Login admin diperlukan' }); return null; }
  if (min === 'owner' && s.role !== 'owner') { exports.send(res, 403, { error: 'Hanya owner yang boleh' }); return null; }
  return s;
};
