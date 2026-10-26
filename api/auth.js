/* Autentikasi.
   POST {e,p}: masuk. e="owner" + p=OWNER_KEY => owner; email admin + kata sandi => admin; email pembeli + kata sandi => user.
        Salah => {ok:false} (jawaban sama untuk semua kasus, tidak membocorkan akun mana yang ada).
   POST {act:"reg",n,e,p}: daftar akun pembeli (kata sandi di-hash scrypt di server).
   GET: siapa saya (cek sesi). PATCH {n}: ubah nama pembeli. DELETE: keluar.
   Setiap sesi baru mengembalikan token sesi (tok) dan token CSRF (csrf). */
const L = require('./_lib');
const U = 'ak:users', A = 'ak:admins';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PW_OK = p => p.length >= 8 && p.length <= 128 && /[A-Za-z]/.test(p) && /\d/.test(p);

module.exports = async (req, res) => {
  try {
    if (!L.ok) return L.send(res, 200, { configured: false });
    if (L.shield(req, res)) return;
    const m = req.method;
    if (m === 'GET') {
      const s = await L.who(req);
      return L.send(res, 200, s ? { role: s.role, e: s.e, n: s.n } : { role: '' });
    }
    if (m === 'DELETE') {
      const s = await L.who(req);
      if (s && !L.csrfPass(req, res, s)) return;
      const t = L.token(req);
      if (t) await L.rc('DEL', 'ak:ses:' + L.hash(t));
      return L.send(res, 200, { ok: true });
    }
    if (m === 'PATCH') {
      const s = await L.who(req);
      if (!s) return L.send(res, 401, { error: 'Masuk dulu' });
      if (!L.csrfPass(req, res, s)) return;
      if (s.role !== 'user') return L.send(res, 403, { error: 'Hanya untuk akun pembeli' });
      const b = req.body && typeof req.body === 'object' ? req.body : {}, n = L.str(b.n, 60);
      if (n.length < 2) return L.send(res, 400, { error: 'Nama minimal 2 karakter' });
      const rec = L.parse(await L.rc('HGET', U, s.e));
      if (!rec) return L.send(res, 401, { error: 'Masuk dulu' });
      await L.rc('HSET', U, s.e, JSON.stringify({ ...rec, n }));
      const k = 'ak:ses:' + L.hash(L.token(req)), ttl = await L.rc('TTL', k);
      if (ttl > 0) await L.rc('SET', k, JSON.stringify({ ...s, n }), 'EX', ttl);
      return L.send(res, 200, { ok: true, n });
    }
    if (m !== 'POST') { res.setHeader('Allow', 'GET, POST, PATCH, DELETE'); return L.send(res, 405, { error: 'Metode tidak didukung' }); }
    const b = req.body && typeof req.body === 'object' ? req.body : {};

    /* ---- daftar akun pembeli ---- */
    if (b.act === 'reg') {
      const n = L.str(b.n, 60), e = L.str(b.e, 120).toLowerCase(), p = String(b.p ?? '');
      if (n.length < 2 || !EMAIL.test(e)) return L.send(res, 400, { error: 'Nama minimal 2 karakter dan email harus valid' });
      if (!PW_OK(p)) return L.send(res, 400, { error: 'Kata sandi 8–128 karakter, berisi huruf dan angka' });
      if (await L.limit('reg:' + L.ip(req), 8, 3600)) return L.send(res, 429, { error: 'Terlalu banyak pendaftaran, coba lagi nanti' });
      if ((await L.rc('HGET', A, e)) || (await L.rc('HGET', U, e))) return L.send(res, 409, { error: 'Email sudah terdaftar' });
      if ((await L.rc('HLEN', U)) >= 5000) return L.send(res, 507, { error: 'Pendaftaran sedang penuh' });
      const rec = { n, e, ...(await L.hashPw(p)), at: Date.now() };
      if (!(await L.rc('HSETNX', U, e, JSON.stringify(rec)))) return L.send(res, 409, { error: 'Email sudah terdaftar' });
      const ses = await L.mkSession({ role: 'user', e, n });
      return L.send(res, 201, { ok: true, ...ses, role: 'user', e, n });
    }

    /* ---- masuk ---- */
    const e = L.str(b.e, 120).toLowerCase(), p = String(b.p ?? '').slice(0, 200);
    if (!e || !p) return L.send(res, 200, { ok: false });
    const fk = 'ak:rl:fa:' + L.ip(req);
    if ((+(await L.rc('GET', fk)) || 0) >= 10) return L.send(res, 429, { error: 'Terlalu banyak percobaan, tunggu 10 menit' });
    let who = null;
    if (e === 'owner') {
      if (L.ownerKey() && L.eq(p, L.ownerKey())) who = { role: 'owner', e: 'owner', n: 'Owner' };
      else await L.dummy(p);
    } else {
      const ra = await L.rc('HGET', A, e), rb = ra ? null : await L.rc('HGET', U, e), raw = ra || rb, rec = L.parse(raw);
      if (rec && (await L.checkPw(p, rec))) {
        who = { role: ra ? 'admin' : 'user', e, n: rec.n };
        if (L.stale(rec)) await L.upgrade(ra ? A : U, e, raw, rec, p);
      } else if (!rec) await L.dummy(p);
    }
    if (!who) { if ((await L.rc('INCR', fk)) === 1) await L.rc('EXPIRE', fk, 600); return L.send(res, 200, { ok: false }); }
    const ses = await L.mkSession(who);
    L.send(res, 200, { ok: true, ...ses, role: who.role, e: who.e, n: who.n });
  } catch (err) { console.error('auth:', err && err.message); L.send(res, 500, { error: 'Kesalahan server' }); }
};
