/* Pembantu API: Redis REST (Upstash / Vercel KV), kunci admin, pembatas laju, sanitasi */
const crypto = require('crypto');
const scrypt = require('util').promisify(crypto.scrypt);
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

/* ---- sesi & peran: owner (kunci OWNER_KEY), admin (akun dari owner), user (pembeli) ---- */
exports.TTL = 28800; // sesi berlaku 8 jam
exports.ownerKey = () => process.env.OWNER_KEY || process.env.ADMIN_KEY || '';
const sha = t => crypto.createHash('sha256').update(String(t));
exports.eq = (a, b) => crypto.timingSafeEqual(sha(a).digest(), sha(b).digest());
exports.hash = t => sha(t).digest('hex');
exports.parse = s => { try { return s ? JSON.parse(s) : null; } catch { return null; } };

/* ---- hash kata sandi: scrypt + salt acak 16 byte per akun (admin dan pembeli).
   Parameter baru mengikuti rekomendasi OWASP (N=2^15, r=8, p=3). Rekaman lama tanpa parameter
   dibaca dengan parameter lama (N=2^14, r=8, p=1) lalu otomatis di-hash ulang saat login berhasil. ---- */
const NEW = { N: 32768, r: 8, p: 3 }, OLD = { N: 16384, r: 8, p: 1 };
const opt = o => ({ N: o.N, r: o.r, p: o.p, maxmem: 128 * 1024 * 1024 });
exports.hashPw = async pw => {
  const s = crypto.randomBytes(16).toString('hex');
  return { s, h: (await scrypt(String(pw), s, 64, opt(NEW))).toString('hex'), ...NEW };
};
exports.checkPw = async (pw, rec) => {
  if (!rec || !/^[0-9a-f]+$/.test(rec.h || '') || !rec.s) return false;
  const prm = rec.N ? { N: +rec.N, r: +rec.r, p: +rec.p } : OLD;
  if (!(prm.N >= 16384 && prm.N <= 131072 && (prm.N & (prm.N - 1)) === 0 && prm.r === 8 && prm.p >= 1 && prm.p <= 5)) return false;
  const want = Buffer.from(rec.h, 'hex'), got = await scrypt(String(pw), rec.s, want.length, opt(prm));
  return got.length === want.length && crypto.timingSafeEqual(got, want);
};
exports.stale = rec => !rec.N || rec.N < NEW.N || rec.p < NEW.p;
/* menyamakan waktu respons saat email tidak ditemukan (tidak membocorkan akun mana yang ada) */
exports.dummy = pw => scrypt(String(pw), 'aksara-dummy-salt-0000', 64, opt(NEW)).then(() => false);
/* menaikkan parameter hash hanya bila rekaman belum berubah sejak dibaca (tidak menghidupkan lagi admin yang baru dicopot) */
exports.upgrade = async (key, field, oldRaw, rec, pw) => {
  try {
    const nx = JSON.stringify({ ...rec, ...(await exports.hashPw(pw)) });
    await exports.rc('EVAL', "if redis.call('HGET',KEYS[1],ARGV[1])==ARGV[2] then redis.call('HSET',KEYS[1],ARGV[1],ARGV[3]) return 1 end return 0", '1', key, field, oldRaw, nx);
  } catch { /* gagal menaikkan hash tidak mengganggu login */ }
};

exports.token = req => { const m = /^Bearer ([0-9a-f]{64})$/.exec(req.headers.authorization || ''); return m ? m[1] : ''; };
/* sesi baru: token acak 256 bit (server hanya menyimpan hash-nya) + token CSRF acak 256 bit yang terikat ke sesi */
exports.mkSession = async who => {
  const tok = crypto.randomBytes(32).toString('hex'), csrf = crypto.randomBytes(32).toString('hex');
  await exports.rc('SET', 'ak:ses:' + exports.hash(tok), JSON.stringify({ ...who, c: csrf }), 'EX', exports.TTL);
  return { tok, csrf };
};
exports.who = async req => {
  const t = exports.token(req);
  if (!t) return null;
  const s = exports.parse(await exports.rc('GET', 'ak:ses:' + exports.hash(t)));
  if (!s) return null;
  if (s.role === 'admin' && !(await exports.rc('HGET', 'ak:admins', s.e))) return null; // admin sudah dicopot
  if (s.role === 'user' && !(await exports.rc('HEXISTS', 'ak:users', s.e))) return null;
  return s;
};

/* ---- perlindungan CSRF ----
   Lapis 1 (semua permintaan pengubah data, termasuk tanpa sesi): Origin / Sec-Fetch-Site harus dari situs sendiri
   dan isi harus application/json (form lintas situs tidak bisa mengirim itu tanpa preflight CORS).
   Lapis 2 (permintaan dengan sesi): header X-CSRF-Token harus sama dengan token acak yang terikat ke sesi itu. */
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);
exports.shield = (req, res) => {
  const m = req.method;
  if (SAFE.has(m)) return false;
  const deny = (code, error) => { exports.send(res, code, { error }); return true; };
  const sf = req.headers['sec-fetch-site'];
  if (sf && sf !== 'same-origin' && sf !== 'none') return deny(403, 'Permintaan lintas situs ditolak');
  const o = req.headers.origin;
  if (o) {
    let h = ''; try { h = new URL(o).host.toLowerCase(); } catch { /* origin rusak */ }
    const ok = [req.headers.host, req.headers['x-forwarded-host']].filter(Boolean).map(x => String(x).split(',')[0].trim().toLowerCase());
    if (!h || !ok.includes(h)) return deny(403, 'Permintaan lintas situs ditolak');
  }
  if ((m === 'POST' || m === 'PUT' || m === 'PATCH') && !/^application\/json\b/i.test(req.headers['content-type'] || '')) return deny(415, 'Format permintaan tidak didukung');
  return false;
};
/* true bila lolos; bila tidak, sudah membalas error */
exports.csrfPass = (req, res, s) => {
  if (SAFE.has(req.method)) return true;
  if (!s.c) { exports.send(res, 401, { error: 'Sesi lama sudah tidak berlaku, silakan masuk lagi' }); return false; }
  const t = String(req.headers['x-csrf-token'] || '');
  if (!/^[0-9a-f]{64}$/.test(t) || !exports.eq(t, s.c)) { exports.send(res, 403, { error: 'Token CSRF tidak valid' }); return false; }
  return true;
};
/* min: 'admin' (admin atau owner) atau 'owner' (hanya owner). Mengembalikan sesi, atau null setelah membalas error. */
exports.gate = async (req, res, min = 'admin') => {
  if (exports.shield(req, res)) return null;
  const s = await exports.who(req);
  if (!s) { exports.send(res, 401, { error: 'Login admin diperlukan' }); return null; }
  if (s.role !== 'admin' && s.role !== 'owner') { exports.send(res, 403, { error: 'Khusus admin' }); return null; }
  if (min === 'owner' && s.role !== 'owner') { exports.send(res, 403, { error: 'Hanya owner yang boleh' }); return null; }
  if (!exports.csrfPass(req, res, s)) return null;
  return s;
};
