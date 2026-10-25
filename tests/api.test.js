/* Uji API AKSARA tanpa dependensi dan tanpa Redis asli.
   Redis (Upstash REST) ditiru di memori, lalu setiap function di api/ dipanggil langsung.
   Jalankan dari akar repo:  node tests/api.test.js */
process.env.KV_REST_API_URL = 'http://redis.mock';
process.env.KV_REST_API_TOKEN = 'mock-token';
process.env.OWNER_KEY = 'kunci-owner-uji-1234567890abcdef';

const path = require('path');
const API = p => require(path.join(__dirname, '..', 'api', p));

/* ---------- Redis tiruan (perintah yang dipakai api/*) ---------- */
const store = new Map();
const hashOf = k => { if (!store.has(k)) store.set(k, new Map()); return store.get(k); };
global.fetch = async (url, init) => {
  const [cmd, ...a] = JSON.parse(init.body); const C = String(cmd).toUpperCase(); let result = null;
  if (C === 'GET') result = store.has(a[0]) ? store.get(a[0]) : null;
  else if (C === 'SET') { store.set(a[0], String(a[1])); result = 'OK'; }
  else if (C === 'DEL') { result = store.delete(a[0]) ? 1 : 0; }
  else if (C === 'INCR') { const n = (+store.get(a[0]) || 0) + 1; store.set(a[0], String(n)); result = n; }
  else if (C === 'EXPIRE') result = 1;
  else if (C === 'HGET') result = hashOf(a[0]).has(a[1]) ? hashOf(a[0]).get(a[1]) : null;
  else if (C === 'HSET') { hashOf(a[0]).set(a[1], String(a[2])); result = 1; }
  else if (C === 'HDEL') result = hashOf(a[0]).delete(a[1]) ? 1 : 0;
  else if (C === 'HLEN') result = hashOf(a[0]).size;
  else if (C === 'HMGET') result = a.slice(1).map(f => hashOf(a[0]).has(f) ? hashOf(a[0]).get(f) : null);
  else if (C === 'HGETALL') result = [...hashOf(a[0])].flat();
  else throw new Error('perintah tiruan belum ada: ' + C);
  return { json: async () => ({ result }) };
};

/* ---------- req/res tiruan ---------- */
async function call(file, { method = 'GET', body, query = {}, tok, ip = '10.0.0.1' } = {}) {
  const req = { method, body, query, headers: { 'x-forwarded-for': ip } };
  if (tok) req.headers.authorization = 'Bearer ' + tok;
  const out = { code: 200, json: null, headers: {} };
  const res = { setHeader: (k, v) => { out.headers[k] = v; }, status: c => { out.code = c; return { json: o => { out.json = o; } }; } };
  await API(file)(req, res);
  return out;
}

/* ---------- kerangka uji ---------- */
const rows = []; let fail = 0;
const t = (nama, ok, ket = '') => { rows.push({ nama, ok: !!ok, ket }); if (!ok) fail++; console.log((ok ? 'LOLOS  ' : 'GAGAL  ') + nama + (ket ? '  [' + ket + ']' : '')); };

(async () => {
  const OWNER = process.env.OWNER_KEY;

  /* 1. Login */
  let r = await call('auth.js', { method: 'POST', body: { e: 'owner', p: 'salah' }, ip: '1.1.1.1' });
  t('Login owner dengan kunci salah ditolak', r.json.ok === false, 'ok=false');
  r = await call('auth.js', { method: 'POST', body: { e: 'owner', p: OWNER }, ip: '1.1.1.2' });
  const ownerTok = r.json.tok;
  t('Login owner dengan kunci benar berhasil', r.json.ok === true && /^[0-9a-f]{64}$/.test(ownerTok || ''), 'token acak 64 heksa');
  t('Kunci sesi di Redis berupa hash, bukan token mentah', store.has('ak:ses:' + require('crypto').createHash('sha256').update(ownerTok).digest('hex')) && !store.has('ak:ses:' + ownerTok));
  t('Jawaban API tidak boleh di-cache', r.headers['Cache-Control'] === 'no-store', 'Cache-Control: no-store');

  /* 2. Wewenang */
  r = await call('content.js', { method: 'PUT', body: { prices: { p1: { p: 1, s: 1 } } } });
  t('PUT /api/content tanpa login ditolak', r.code === 401, 'HTTP ' + r.code);
  r = await call('content.js', { method: 'PUT', body: {}, tok: 'a'.repeat(64) });
  t('PUT /api/content dengan token palsu ditolak', r.code === 401, 'HTTP ' + r.code);
  r = await call('finance.js', {});
  t('GET /api/finance tanpa login ditolak (data modal tidak bocor)', r.code === 401, 'HTTP ' + r.code);
  r = await call('inbox.js', { query: { all: '1' } });
  t('Membaca seluruh inbox tanpa login ditolak', r.code === 401, 'HTTP ' + r.code);
  r = await call('staff.js', {});
  t('GET /api/staff tanpa login ditolak', r.code === 401, 'HTTP ' + r.code);

  /* 3. Owner mengangkat admin */
  r = await call('staff.js', { method: 'POST', tok: ownerTok, body: { n: 'Adm', e: 'adm@x.id', p: 'pendek' } });
  t('Kata sandi admin < 10 karakter ditolak', r.code === 400, 'HTTP ' + r.code);
  r = await call('staff.js', { method: 'POST', tok: ownerTok, body: { n: 'Admin Uji', e: 'Admin@Toko.id', p: 'sandi-admin-12345' } });
  t('Owner berhasil mengangkat admin', r.code === 201, 'HTTP ' + r.code);
  const rec = JSON.parse(hashOf('ak:admins').get('admin@toko.id') || 'null');
  t('Kata sandi admin disimpan sebagai hash scrypt + salt, bukan teks asli', !!rec && /^[0-9a-f]{128}$/.test(rec.h) && rec.s && !JSON.stringify(rec).includes('sandi-admin-12345'), 'email dinormalkan huruf kecil');
  r = await call('auth.js', { method: 'POST', body: { e: 'ADMIN@toko.id', p: 'sandi-admin-12345' }, ip: '1.1.1.3' });
  const admTok = r.json.tok;
  t('Admin dapat login (email tidak peka huruf besar/kecil)', r.json.ok === true && r.json.role === 'admin');
  r = await call('auth.js', { method: 'POST', body: { e: 'tidak@ada.id', p: 'apa-saja-12345' }, ip: '1.1.1.4' });
  const r2 = await call('auth.js', { method: 'POST', body: { e: 'admin@toko.id', p: 'salah-salah-1' }, ip: '1.1.1.5' });
  t('Jawaban gagal login sama untuk akun tak ada dan sandi salah', JSON.stringify(r.json) === JSON.stringify(r2.json), 'tidak membocorkan siapa admin');
  r = await call('staff.js', { tok: admTok });
  t('Admin tidak boleh membuka daftar staf (khusus owner)', r.code === 403, 'HTTP ' + r.code);
  r = await call('staff.js', { method: 'POST', tok: admTok, body: { n: 'Admin Dua', e: 'dua@toko.id', p: 'sandi-admin-12345' } });
  t('Admin tidak boleh mengangkat admin lain', r.code === 403, 'HTTP ' + r.code);
  r = await call('staff.js', { method: 'DELETE', tok: admTok, query: { e: 'admin@toko.id' } });
  t('Admin tidak boleh mencopot admin', r.code === 403, 'HTTP ' + r.code);
  r = await call('finance.js', { method: 'PUT', tok: admTok, body: { cost: { p1: 50 }, bop: [{ n: 'Sewa', a: 1500 }] } });
  t('Admin boleh menyimpan modal dan BOP', r.code === 200 && r.json.cost.p1 === 50);

  /* 4. Sanitasi input */
  r = await call('content.js', { method: 'PUT', tok: admTok, body: {
    articles: [
      { t: 'Artikel aman', u: 'https://contoh.id/a', j: 'Jurnal', b: 'FTI', y: 2025 },
      { t: 'Skrip jahat', u: 'javascript:alert(1)', j: 'Artikel', b: 'Umum', y: 2025 },
      { t: 'Data URL', u: 'data:text/html,<script>alert(1)</script>', j: 'Artikel', b: 'Umum', y: 2025 }],
    about: { t: 'Judul\u0000\u0007 bersih', i: 'x'.repeat(5000), ps: [], v: [] },
    prices: { p1: { p: -50, s: -9 }, 'bad id<script>': { p: 10, s: 1 }, p2: { p: 99.9, s: 3.7 } } } });
  const d = r.json && r.json.data || {};
  t('Artikel dengan URL javascript: dan data: dibuang', r.code === 200 && d.articles.length === 1 && d.articles[0].u === 'https://contoh.id/a', d.articles ? d.articles.length + ' artikel tersisa' : '');
  t('Karakter kontrol dibuang dan teks panjang dipotong', d.about.t === 'Judul bersih' && d.about.i.length === 400, 'judul 12 huruf, isi 400 karakter');
  t('Harga minimal 1, stok minimal 0, ID aneh ditolak, angka dibulatkan', d.prices.p1.p === 1 && d.prices.p1.s === 0 && !d.prices['bad id<script>'] && d.prices.p2.p === 99 && d.prices.p2.s === 3);
  r = await call('content.js', { method: 'GET' });
  t('Konten publik bisa dibaca pengunjung tanpa login', r.code === 200 && r.json.configured === true);
  r = await call('content.js', { method: 'DELETE' });
  t('Metode tidak didukung dijawab 405', r.code === 405, 'HTTP ' + r.code);

  /* 5. Inbox */
  const ipI = '2.2.2.2';
  r = await call('inbox.js', { method: 'POST', ip: ipI, body: { n: 'A', e: 'bukan-email', t: 'pendek' } });
  t('Pesan dengan nama/email/isi tidak valid ditolak', r.code === 400, 'HTTP ' + r.code);
  r = await call('inbox.js', { method: 'POST', ip: ipI, body: { n: 'Budi', e: 'budi@x.id', t: 'Apakah ada diskon untuk pembelian paket?', s: 'Pesanan' } });
  const { id, tok } = r.json;
  t('Pesan valid diterima dan mendapat id + token rahasia', r.code === 201 && id && /^[0-9a-f]{24}$/.test(tok));
  r = await call('inbox.js', { query: { ids: id + '.' + '0'.repeat(24) } });
  t('Pesan tidak bisa dibaca dengan token salah', r.json.messages.length === 0);
  r = await call('inbox.js', { method: 'PATCH', tok: admTok, body: { id, r: 'Ada, diskon 15% untuk paket semester.' } });
  t('Admin dapat membalas pesan', r.code === 200);
  r = await call('inbox.js', { query: { ids: id + '.' + tok } });
  t('Pengirim membaca balasan dengan id + token yang cocok', r.json.messages.length === 1 && r.json.messages[0].r.startsWith('Ada'));
  r = await call('inbox.js', { query: { all: '1' }, tok: admTok });
  t('Daftar inbox untuk admin tidak memuat token rahasia pesan', r.json.messages.length === 1 && !('tok' in r.json.messages[0]));
  let last;
  for (let i = 0; i < 5; i++) last = await call('inbox.js', { method: 'POST', ip: ipI, body: { n: 'Budi', e: 'budi@x.id', t: 'Pesan ke-' + i + ' untuk uji batas laju.' } });
  t('Pesan ke-6 dalam 10 menit dari satu IP dibatasi (429)', last.code === 429, 'HTTP ' + last.code);
  r = await call('inbox.js', { method: 'POST', ip: '3.3.3.3', body: { h: 'bot', n: 'Bot', e: 'bot@x.id', t: 'Isi spam dari bot otomatis.' } });
  const sebelum = hashOf('ak:msgs').size;
  t('Honeypot: pesan bot tidak disimpan', r.code === 201 && r.json.id === 'x' && hashOf('ak:msgs').size === sebelum);

  /* 6. Pembatasan login */
  let code = 0;
  for (let i = 0; i < 11; i++) { r = await call('auth.js', { method: 'POST', body: { e: 'owner', p: 'tebakan-' + i }, ip: '9.9.9.9' }); code = r.code; }
  t('Setelah 10 gagal login dari satu IP, percobaan berikutnya dikunci (429)', code === 429, 'HTTP ' + code);
  r = await call('auth.js', { method: 'POST', body: { e: 'owner', p: OWNER }, ip: '9.9.9.9' });
  t('Kunci berlaku walau kata sandi yang dikirim benar', r.code === 429);

  /* 7. Pencopotan admin */
  r = await call('staff.js', { method: 'DELETE', tok: ownerTok, query: { e: 'admin@toko.id' } });
  t('Owner berhasil mencopot admin', r.code === 200);
  r = await call('content.js', { method: 'PUT', tok: admTok, body: {} });
  t('Token admin yang dicopot langsung tidak berlaku', r.code === 401, 'HTTP ' + r.code);
  r = await call('auth.js', { method: 'DELETE', tok: ownerTok });
  r = await call('finance.js', { tok: ownerTok });
  t('Setelah logout, token owner tidak berlaku lagi', r.code === 401, 'HTTP ' + r.code);

  console.log('\nRingkasan: ' + (rows.length - fail) + ' dari ' + rows.length + ' pengujian lolos.');
  require('fs').writeFileSync(process.env.UJI_JSON || path.join(__dirname, 'hasil-uji.json'), JSON.stringify(rows, null, 1));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
