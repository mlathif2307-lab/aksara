/* Uji keamanan API (tanpa dependensi, Redis tiruan di memori): node tests/security.test.js
   Mencakup: CSRF (Origin/Sec-Fetch-Site, tipe isi, token per sesi), hash scrypt, akun pembeli, peran, pembatas laju. */
process.env.KV_REST_API_URL = 'http://redis.test'; process.env.KV_REST_API_TOKEN = 'x'; process.env.OWNER_KEY = 'kunci-owner-uji-yang-panjang-sekali-123';
const crypto = require('crypto'), assert = require('assert');

/* ---- Redis REST tiruan ---- */
const kv = new Map(), ttl = new Map();
const H = k => { if (!kv.has(k)) kv.set(k, new Map()); return kv.get(k); };
global.fetch = async (_u, init) => {
  const [c, ...a] = JSON.parse(init.body); let r = null;
  switch (c.toUpperCase()) {
    case 'GET': r = kv.has(a[0]) ? kv.get(a[0]) : null; break;
    case 'SET': kv.set(a[0], a[1]); if (a[2] === 'EX') ttl.set(a[0], +a[3]); r = 'OK'; break;
    case 'DEL': r = kv.delete(a[0]) ? 1 : 0; break;
    case 'INCR': kv.set(a[0], (+kv.get(a[0]) || 0) + 1); r = kv.get(a[0]); break;
    case 'EXPIRE': ttl.set(a[0], +a[1]); r = 1; break;
    case 'TTL': r = ttl.get(a[0]) || -1; break;
    case 'HGET': r = H(a[0]).has(a[1]) ? H(a[0]).get(a[1]) : null; break;
    case 'HEXISTS': r = H(a[0]).has(a[1]) ? 1 : 0; break;
    case 'HSET': H(a[0]).set(a[1], a[2]); r = 1; break;
    case 'HSETNX': if (H(a[0]).has(a[1])) r = 0; else { H(a[0]).set(a[1], a[2]); r = 1; } break;
    case 'HDEL': r = H(a[0]).delete(a[1]) ? 1 : 0; break;
    case 'HLEN': r = H(a[0]).size; break;
    case 'HGETALL': r = [...H(a[0])].flat(); break;
    case 'HMGET': r = a.slice(1).map(f => H(a[0]).has(f) ? H(a[0]).get(f) : null); break;
    case 'EVAL': { const [, , key, f, old, nx] = a; if (H(key).get(f) === old) { H(key).set(f, nx); r = 1; } else r = 0; break; }
    default: throw new Error('perintah tiruan belum ada: ' + c);
  }
  return { json: async () => ({ result: r }) };
};

const api = n => require('../api/' + n + '.js');
const call = async (name, method, { body, q = {}, h = {}, tok, csrf, ip = '1.1.1.1', json = true } = {}) => {
  const headers = { host: 'aksara.test', 'x-forwarded-for': ip, ...(json && method !== 'GET' && method !== 'DELETE' ? { 'content-type': 'application/json' } : {}), ...h };
  if (tok) headers.authorization = 'Bearer ' + tok;
  if (csrf) headers['x-csrf-token'] = csrf;
  const out = {}; const res = { setHeader() {}, status(c) { out.st = c; return this; }, json(o) { out.b = o; return this; } };
  await api(name)({ method, headers, query: q, body }, res); return out;
};
let n = 0; const ok = (name, cond, extra) => { n++; if (!cond) { console.error('GAGAL:', name, extra !== undefined ? JSON.stringify(extra) : ''); process.exitCode = 1; } else console.log('lolos:', name); };

(async () => {
  /* ---- owner & sesi ---- */
  let r = await call('auth', 'POST', { body: { e: 'owner', p: 'salah' } }); ok('kunci owner salah ditolak', r.st === 200 && r.b.ok === false);
  r = await call('auth', 'POST', { body: { e: 'owner', p: process.env.OWNER_KEY } }); const O = r.b;
  ok('owner masuk: token sesi 64 heksa + token CSRF 64 heksa', O.ok && /^[0-9a-f]{64}$/.test(O.tok) && /^[0-9a-f]{64}$/.test(O.csrf) && O.tok !== O.csrf);
  ok('Redis tidak menyimpan token mentah (hanya hash)', ![...kv.keys()].some(k => k.includes(O.tok)));

  /* ---- CSRF: lapis 1 (asal permintaan & tipe isi) ---- */
  const adm = { name: 'Adit', e: 'adit@kampus.test', p: 'SandiPanjang123' };
  const mk = (x = {}) => ({ body: { n: adm.name, e: adm.e, p: adm.p }, tok: O.tok, csrf: O.csrf, ...x });
  r = await call('staff', 'POST', mk({ h: { origin: 'https://situs-jahat.example' } })); ok('Origin asing ditolak (403)', r.st === 403, r);
  r = await call('staff', 'POST', mk({ h: { 'sec-fetch-site': 'cross-site' } })); ok('Sec-Fetch-Site cross-site ditolak (403)', r.st === 403, r);
  r = await call('staff', 'POST', mk({ h: { 'sec-fetch-site': 'same-site' } })); ok('Sec-Fetch-Site same-site (subdomain) ditolak', r.st === 403, r);
  r = await call('staff', 'POST', mk({ h: { 'content-type': 'text/plain' } })); ok('isi bukan JSON ditolak (415)', r.st === 415, r);
  r = await call('staff', 'POST', mk({ h: { origin: 'https://aksara.test' } })); ok('Origin sendiri diterima', r.st === 201, r); // sekaligus mengangkat admin
  r = await call('staff', 'POST', mk({ body: { n: 'Xavier', e: 'x@kampus.test', p: 'SandiPanjang123' }, h: { origin: 'https://aksara.test', 'sec-fetch-site': 'same-origin' } })); ok('Sec-Fetch-Site same-origin diterima', r.st === 201, r);

  /* ---- CSRF: lapis 2 (token per sesi) ---- */
  r = await call('staff', 'POST', mk({ csrf: undefined, body: { n: 'Y', e: 'y@kampus.test', p: 'SandiPanjang123' } })); ok('tanpa token CSRF ditolak (403)', r.st === 403, r);
  r = await call('staff', 'POST', mk({ csrf: 'a'.repeat(64), body: { n: 'Y', e: 'y@kampus.test', p: 'SandiPanjang123' } })); ok('token CSRF salah ditolak (403)', r.st === 403, r);
  r = await call('staff', 'GET', { tok: O.tok }); ok('GET tidak butuh token CSRF', r.st === 200 && r.b.admins.length === 2, r);
  ok('admin tersimpan sebagai scrypt N=32768 r=8 p=3, salt acak', (() => { const x = JSON.parse(H('ak:admins').get(adm.e)); return x.N === 32768 && x.r === 8 && x.p === 3 && x.s.length === 32 && x.h.length === 128 && !JSON.stringify(x).includes(adm.p); })());
  r = await call('staff', 'POST', mk({ body: { n: 'Z', e: 'z@kampus.test', p: 'pendek' } })); ok('kata sandi admin < 10 karakter ditolak', r.st === 400);

  /* ---- sesi lama (tanpa token CSRF) ---- */
  const oldTok = crypto.randomBytes(32).toString('hex');
  kv.set('ak:ses:' + crypto.createHash('sha256').update(oldTok).digest('hex'), JSON.stringify({ role: 'owner', e: 'owner', n: 'Owner' }));
  r = await call('staff', 'POST', { body: { n: 'Q', e: 'q@kampus.test', p: 'SandiPanjang123' }, tok: oldTok, csrf: O.csrf }); ok('sesi lama tanpa CSRF diminta masuk ulang (401)', r.st === 401, r);

  /* ---- admin ---- */
  r = await call('auth', 'POST', { body: { e: adm.e, p: adm.p } }); const A = r.b; ok('admin masuk', A.ok && A.role === 'admin' && A.csrf);
  r = await call('staff', 'GET', { tok: A.tok }); ok('admin tidak boleh membuka endpoint owner (403)', r.st === 403);
  r = await call('finance', 'PUT', { tok: A.tok, body: { cost: { p1: 10 }, bop: [] } }); ok('admin tanpa CSRF ditolak', r.st === 403);
  r = await call('finance', 'PUT', { tok: A.tok, csrf: A.csrf, body: { cost: { p1: 10 }, bop: [] } }); ok('admin dengan CSRF boleh', r.st === 200, r);
  r = await call('finance', 'PUT', { tok: A.tok, csrf: O.csrf, body: { cost: {}, bop: [] } }); ok('token CSRF milik sesi lain ditolak', r.st === 403);
  r = await call('content', 'PUT', { tok: A.tok, csrf: A.csrf, body: { prices: { p1: { p: -5, s: -2 } } } }); ok('sanitasi harga/stok tetap jalan', r.st === 200 && r.b.data.prices.p1.p === 1 && r.b.data.prices.p1.s === 0, r);

  /* ---- hash lama otomatis dinaikkan ---- */
  const legacy = 'LamaSandi12345', salt = crypto.randomBytes(16).toString('hex');
  H('ak:admins').set('lama@kampus.test', JSON.stringify({ n: 'Lama', e: 'lama@kampus.test', s: salt, h: crypto.scryptSync(legacy, salt, 64).toString('hex'), at: 1 }));
  r = await call('auth', 'POST', { body: { e: 'lama@kampus.test', p: legacy } }); ok('admin dengan hash lama masih bisa masuk', r.b.ok === true, r.b);
  ok('hash lama dinaikkan ke parameter baru', JSON.parse(H('ak:admins').get('lama@kampus.test')).N === 32768);
  r = await call('auth', 'POST', { body: { e: 'lama@kampus.test', p: legacy } }); ok('setelah dinaikkan tetap bisa masuk', r.b.ok === true);

  /* ---- mencopot admin ---- */
  r = await call('staff', 'DELETE', { tok: O.tok, q: { e: adm.e } }); ok('copot admin tanpa CSRF ditolak', r.st === 403);
  r = await call('staff', 'DELETE', { tok: O.tok, csrf: O.csrf, q: { e: adm.e } }); ok('copot admin dengan CSRF', r.st === 200);
  r = await call('finance', 'GET', { tok: A.tok }); ok('sesi admin yang dicopot langsung mati (401)', r.st === 401);
  r = await call('auth', 'POST', { body: { e: adm.e, p: adm.p } }); ok('admin yang dicopot tidak bisa masuk', r.b.ok === false);

  /* ---- akun pembeli ---- */
  const buyer = { n: 'Rina Putri', e: 'Rina@Kampus.test', p: 'Rahasia2026' };
  r = await call('auth', 'POST', { body: { act: 'reg', ...buyer, p: 'tanpaangka' } }); ok('daftar: kata sandi tanpa angka ditolak', r.st === 400);
  r = await call('auth', 'POST', { body: { act: 'reg', ...buyer, p: 'a1' } }); ok('daftar: kata sandi pendek ditolak', r.st === 400);
  r = await call('auth', 'POST', { body: { act: 'reg', ...buyer, e: 'bukan-email' } }); ok('daftar: email tidak valid ditolak', r.st === 400);
  r = await call('auth', 'POST', { h: { origin: 'https://situs-jahat.example' }, body: { act: 'reg', ...buyer } }); ok('daftar dari situs asing ditolak', r.st === 403);
  r = await call('auth', 'POST', { body: { act: 'reg', ...buyer } }); const B = r.b; ok('daftar berhasil: sesi user + token CSRF', r.st === 201 && B.role === 'user' && B.e === 'rina@kampus.test' && /^[0-9a-f]{64}$/.test(B.csrf), r);
  ok('kata sandi pembeli tersimpan sebagai scrypt (bukan teks/SHA-256 polos)', (() => { const x = JSON.parse(H('ak:users').get('rina@kampus.test')); return x.N === 32768 && x.h.length === 128 && x.s.length === 32 && !JSON.stringify(x).includes(buyer.p) && x.h !== crypto.createHash('sha256').update(x.s + buyer.p).digest('hex'); })());
  r = await call('auth', 'POST', { body: { act: 'reg', ...buyer } }); ok('email sama tidak bisa daftar dua kali (409)', r.st === 409);
  r = await call('auth', 'POST', { body: { act: 'reg', n: 'Pura-pura', e: 'owner@kampus.test', p: 'Rahasia2026' }, ip: '9.9.9.9' }); ok('email lain bisa daftar', r.st === 201);
  r = await call('auth', 'POST', { body: { e: 'rina@kampus.test', p: 'SalahSekali1' } }); ok('pembeli salah sandi → ok:false', r.b.ok === false);
  r = await call('auth', 'POST', { body: { e: ' RINA@kampus.test ', p: buyer.p } }); const B2 = r.b; ok('pembeli masuk (email tak peka huruf besar)', B2.ok && B2.role === 'user' && B2.csrf);
  r = await call('auth', 'GET', { tok: B2.tok }); ok('GET sesi pembeli', r.b.role === 'user' && r.b.e === 'rina@kampus.test');
  for (const [nm, m, o] of [['staff', 'GET', {}], ['finance', 'GET', {}], ['inbox', 'GET', { q: { all: '1' } }], ['content', 'PUT', { body: { prices: {} }, csrf: B2.csrf }]]) { r = await call(nm, m, { tok: B2.tok, ...o }); ok('sesi pembeli ditolak di /api/' + nm + ' (403)', r.st === 403, r); }
  r = await call('auth', 'PATCH', { tok: B2.tok, body: { n: 'Rina P' } }); ok('ubah nama tanpa CSRF ditolak', r.st === 403);
  r = await call('auth', 'PATCH', { tok: B2.tok, csrf: B2.csrf, body: { n: 'Rina P' } }); ok('ubah nama dengan CSRF', r.st === 200 && JSON.parse(H('ak:users').get('rina@kampus.test')).n === 'Rina P');
  r = await call('auth', 'PATCH', { tok: B2.tok, csrf: B2.csrf, body: { n: 'R' } }); ok('nama terlalu pendek ditolak', r.st === 400);
  r = await call('auth', 'DELETE', { tok: B2.tok }); ok('keluar tanpa CSRF ditolak', r.st === 403);
  r = await call('auth', 'GET', { tok: B2.tok }); ok('sesi masih hidup setelah logout palsu', r.b.role === 'user');
  r = await call('auth', 'DELETE', { tok: B2.tok, csrf: B2.csrf }); ok('keluar dengan CSRF', r.st === 200);
  r = await call('auth', 'GET', { tok: B2.tok }); ok('token mati setelah keluar', r.b.role === '');
  r = await call('auth', 'POST', { body: { e: 'rina@kampus.test', p: buyer.p } }); const B3 = r.b;
  H('ak:users').delete('rina@kampus.test'); r = await call('auth', 'GET', { tok: B3.tok }); ok('sesi pembeli yang akunnya dihapus mati', r.b.role === '');

  /* ---- inbox anonim ---- */
  const msg = { n: 'Tamu', e: 'tamu@kampus.test', s: 'Pesanan', t: 'Kapan pesanan saya dikirim ya?' };
  r = await call('inbox', 'POST', { body: msg, h: { origin: 'https://situs-jahat.example' } }); ok('inbox: kirim dari situs asing ditolak', r.st === 403);
  r = await call('inbox', 'POST', { body: msg, json: false, h: { 'content-type': 'application/x-www-form-urlencoded' } }); ok('inbox: form biasa ditolak (415)', r.st === 415);
  r = await call('inbox', 'POST', { body: msg, h: { origin: 'https://aksara.test' } }); ok('inbox: kirim dari situs sendiri', r.st === 201 && r.b.tok, r);
  r = await call('inbox', 'GET', { q: { ids: r.b.id + '.' + r.b.tok } }); ok('inbox: pemilik token melihat pesannya', r.b.messages.length === 1);
  for (let i = 0; i < 5; i++) r = await call('inbox', 'POST', { body: msg });
  ok('inbox: pesan ke-6 dalam 10 menit → 429', r.st === 429, r);

  /* ---- pembatas laju login ---- */
  for (let i = 0; i < 10; i++) await call('auth', 'POST', { body: { e: 'owner', p: 'salah' }, ip: '7.7.7.7' });
  r = await call('auth', 'POST', { body: { e: 'owner', p: process.env.OWNER_KEY }, ip: '7.7.7.7' }); ok('setelah 10 gagal, kunci benar pun 429', r.st === 429);
  let rr; for (let i = 0; i < 9; i++) rr = await call('auth', 'POST', { body: { act: 'reg', n: 'Bot ' + i, e: `bot${i}@x.test`, p: 'Rahasia2026' }, ip: '6.6.6.6' });
  ok('pendaftaran dibatasi 8 per jam per IP', rr.st === 429, rr);
  console.log(`\n${n} skenario dijalankan` + (process.exitCode ? ' — ADA YANG GAGAL' : ' — semuanya lolos'));
})().catch(e => { console.error(e); process.exit(1); });
