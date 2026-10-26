/* Kelola admin — HANYA owner. GET: daftar admin. POST {n,e,p}: angkat admin baru. DELETE ?e=: copot admin. */
const L = require('./_lib');
const A = 'ak:admins';

module.exports = async (req, res) => {
  try {
    if (!L.ok) return L.send(res, 200, { configured: false });
    if (L.shield(req, res)) return;
    if (!(await L.gate(req, res, 'owner'))) return;
    if (req.method === 'GET') {
      const all = await L.rc('HGETALL', A), out = [];
      for (let i = 1; i < all.length; i += 2) { try { const r = JSON.parse(all[i]); out.push({ n: r.n, e: r.e, at: r.at }); } catch {} }
      return L.send(res, 200, { admins: out.sort((a, b) => b.at - a.at) });
    }
    if (req.method === 'POST') {
      const b = req.body && typeof req.body === 'object' ? req.body : {}, n = L.str(b.n, 60), e = L.str(b.e, 120).toLowerCase(), p = String(b.p || '').slice(0, 200);
      if (n.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) || p.length < 10 || p.length > 128) return L.send(res, 400, { error: 'Nama ≥2 karakter, email valid, kata sandi 10–128 karakter' });
      if (await L.rc('HGET', A, e)) return L.send(res, 409, { error: 'Email sudah menjadi admin' });
      if ((await L.rc('HLEN', A)) >= 50) return L.send(res, 507, { error: 'Batas 50 admin tercapai' });
      await L.rc('HSET', A, e, JSON.stringify({ n, e, ...(await L.hashPw(p)), at: Date.now() }));
      return L.send(res, 201, { ok: true });
    }
    if (req.method === 'DELETE') {
      const e = L.str(req.query.e || (req.body && req.body.e), 120).toLowerCase();
      if (!e) return L.send(res, 400, { error: 'Email wajib diisi' });
      await L.rc('HDEL', A, e); // sesi admin itu langsung tidak berlaku (dicek di L.who)
      return L.send(res, 200, { ok: true });
    }
    res.setHeader('Allow', 'GET, POST, DELETE');
    L.send(res, 405, { error: 'Metode tidak didukung' });
  } catch (err) { console.error('staff:', err && err.message); L.send(res, 500, { error: 'Kesalahan server' }); }
};
