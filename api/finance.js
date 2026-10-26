/* Data modal produk & BOP — HANYA admin/owner. Tidak pernah dikirim ke pengunjung. */
const L = require('./_lib');
const K = 'ak:fin';
const num = (v, max) => Math.min(max, Math.max(0, Math.round((+v || 0) * 100) / 100));

module.exports = async (req, res) => {
  try {
    if (!L.ok) return L.send(res, 200, { configured: false });
    if (L.shield(req, res)) return;
    if (!(await L.gate(req, res))) return;
    if (req.method === 'GET') {
      const raw = await L.rc('GET', K), d = raw ? JSON.parse(raw) : {};
      return L.send(res, 200, { cost: d.cost || {}, bop: d.bop || [] });
    }
    if (req.method === 'PUT') {
      const b = req.body && typeof req.body === 'object' ? req.body : {}, cost = {};
      Object.entries(b.cost && typeof b.cost === 'object' ? b.cost : {}).slice(0, 500).forEach(([id, v]) => { const n = num(v, 1e7); if (/^[\w-]{1,40}$/.test(id) && n > 0) cost[id] = n; });
      const bop = (Array.isArray(b.bop) ? b.bop : []).slice(0, 50).map(x => ({ n: L.str(x && x.n, 60), a: num(x && x.a, 1e7) })).filter(x => x.n);
      await L.rc('SET', K, JSON.stringify({ cost, bop }));
      return L.send(res, 200, { cost, bop });
    }
    res.setHeader('Allow', 'GET, PUT');
    L.send(res, 405, { error: 'Metode tidak didukung' });
  } catch (e) { L.send(res, 500, { error: 'Kesalahan server' }); }
};
