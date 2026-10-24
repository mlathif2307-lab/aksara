/* GET: konten publik (Tentang, Kontak, artikel inspirasi, harga & stok). PUT: simpan (khusus admin). */
const L = require('./_lib');
const KEY = 'ak:content';
const J = ['Skripsi', 'Makalah', 'Jurnal', 'Artikel', 'Portal'], B = ['FTI', 'FEB', 'Umum'];

function clean(b, old) {
  const o = { ...old };
  if (b.about && typeof b.about === 'object') {
    const a = b.about;
    o.about = { t: L.str(a.t, 120), i: L.str(a.i, 400), ps: (Array.isArray(a.ps) ? a.ps : []).slice(0, 8).map(x => L.str(x, 1200)).filter(Boolean), v: (Array.isArray(a.v) ? a.v : []).slice(0, 3).map(x => ({ t: L.str(x && x.t, 60), d: L.str(x && x.d, 300) })) };
  }
  if (b.contact && typeof b.contact === 'object') {
    const c = b.contact;
    o.contact = { t: L.str(c.t, 120), i: L.str(c.i, 400), em: L.str(c.em, 120), wa: L.str(c.wa, 30), ad: L.str(c.ad, 200), jam: L.str(c.jam, 120) };
  }
  if (Array.isArray(b.articles)) {
    o.articles = b.articles.slice(0, 300).map((a, i) => ({ id: L.str(a && a.id, 40) || 'a' + Date.now().toString(36) + i, t: L.str(a && a.t, 160), j: J.includes(a && a.j) ? a.j : 'Artikel', b: B.includes(a && a.b) ? a.b : 'Umum', y: Math.min(2100, Math.max(1990, Math.floor(+(a && a.y)) || new Date().getFullYear())), s: L.str(a && a.s, 60), u: L.url(a && a.u), k: L.str(a && a.k, 200) })).filter(a => a.t && a.u);
  }
  if (b.prices && typeof b.prices === 'object') {
    o.prices = {};
    Object.entries(b.prices).slice(0, 500).forEach(([id, v]) => { if (/^[\w-]{1,40}$/.test(id) && v) o.prices[id] = { p: Math.max(1, Math.floor(+v.p) || 1), s: Math.max(0, Math.floor(+v.s) || 0) }; });
  }
  return o;
}

module.exports = async (req, res) => {
  try {
    if (!L.ok) return L.send(res, 200, { configured: false });
    if (req.method === 'GET') {
      const raw = await L.rc('GET', KEY);
      return L.send(res, 200, { configured: true, data: raw ? JSON.parse(raw) : {} });
    }
    if (req.method === 'PUT') {
      if (!(await L.gate(req, res))) return;
      const raw = await L.rc('GET', KEY);
      const next = clean(req.body && typeof req.body === 'object' ? req.body : {}, raw ? JSON.parse(raw) : {});
      await L.rc('SET', KEY, JSON.stringify(next));
      return L.send(res, 200, { configured: true, data: next });
    }
    res.setHeader('Allow', 'GET, PUT');
    L.send(res, 405, { error: 'Metode tidak didukung' });
  } catch (e) { L.send(res, 500, { error: 'Kesalahan server' }); }
};
