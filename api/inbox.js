/* Inbox: POST (pengunjung kirim pertanyaan), GET (pengunjung lihat balasan miliknya / admin lihat semua),
   PATCH (admin membalas), DELETE (admin menghapus). */
const crypto = require('crypto');
const L = require('./_lib');
const H = 'ak:msgs', SUBJ = ['Pertanyaan website', 'Pesanan', 'Pembayaran', 'Lainnya'];
const parse = s => { try { return JSON.parse(s); } catch { return null; } };

module.exports = async (req, res) => {
  try {
    if (!L.ok) return L.send(res, 200, { configured: false });
    if (L.shield(req, res)) return;
    const m = req.method;
    if (m === 'POST') {
      const b = req.body && typeof req.body === 'object' ? req.body : {};
      if (b.h) return L.send(res, 201, { id: 'x', tok: '' }); // honeypot
      const n = L.str(b.n, 60), e = L.str(b.e, 120), t = L.str(b.t, 2000), s = SUBJ.includes(b.s) ? b.s : 'Lainnya';
      if (n.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) || t.length < 10) return L.send(res, 400, { error: 'Data tidak valid' });
      if (await L.limit('msg:' + L.ip(req), 5, 600)) return L.send(res, 429, { error: 'Terlalu banyak pesan, coba lagi nanti' });
      if ((await L.rc('HLEN', H)) > 2000) return L.send(res, 507, { error: 'Inbox penuh' });
      const id = 'm' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex'), tok = crypto.randomBytes(12).toString('hex');
      await L.rc('HSET', H, id, JSON.stringify({ id, tok, n, e, s, t, at: Date.now(), r: '', ra: 0 }));
      return L.send(res, 201, { id, tok });
    }
    if (m === 'GET') {
      if (req.query.all) {
        if (!(await L.gate(req, res))) return;
        const all = await L.rc('HGETALL', H), out = [];
        for (let i = 1; i < all.length; i += 2) { const r = parse(all[i]); if (r) { delete r.tok; out.push(r); } }
        return L.send(res, 200, { messages: out.sort((a, b) => b.at - a.at) });
      }
      const pairs = String(req.query.ids || '').split(',').slice(0, 20).map(x => x.split('.')).filter(x => /^m[\w]{4,40}$/.test(x[0]) && /^[0-9a-f]{24}$/.test(x[1] || ''));
      if (!pairs.length) return L.send(res, 200, { messages: [] });
      const rows = await L.rc('HMGET', H, ...pairs.map(p => p[0])), out = [];
      rows.forEach((raw, i) => { const r = raw && parse(raw); if (r && r.tok === pairs[i][1]) out.push({ id: r.id, s: r.s, t: r.t, at: r.at, r: r.r, ra: r.ra }); });
      return L.send(res, 200, { messages: out.sort((a, b) => b.at - a.at) });
    }
    if (m === 'PATCH' || m === 'DELETE') {
      if (!(await L.gate(req, res))) return;
      const b = req.body && typeof req.body === 'object' ? req.body : {}, id = L.str(m === 'DELETE' ? (req.query.id || b.id) : b.id, 40);
      if (!/^m[\w]{4,40}$/.test(id)) return L.send(res, 400, { error: 'ID tidak valid' });
      if (m === 'DELETE') { await L.rc('HDEL', H, id); return L.send(res, 200, { ok: true }); }
      const rec = parse(await L.rc('HGET', H, id));
      if (!rec) return L.send(res, 404, { error: 'Pesan tidak ditemukan' });
      rec.r = L.str(b.r, 2000); rec.ra = rec.r ? Date.now() : 0;
      await L.rc('HSET', H, id, JSON.stringify(rec));
      return L.send(res, 200, { ok: true });
    }
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    L.send(res, 405, { error: 'Metode tidak didukung' });
  } catch (e) { L.send(res, 500, { error: 'Kesalahan server' }); }
};
