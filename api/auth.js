/* POST {e,p}: login staf. e="owner" + p=OWNER_KEY => owner; e=email admin + p=kata sandi => admin.
   Bukan staf / salah => {ok:false} (sama untuk semua kasus, supaya tidak membocorkan siapa admin).
   GET: siapa saya (cek sesi). DELETE: keluar. */
const crypto = require('crypto');
const L = require('./_lib');
const TTL = 28800; // 8 jam

module.exports = async (req, res) => {
  try {
    if (!L.ok) return L.send(res, 200, { configured: false });
    if (req.method === 'GET') {
      const s = await L.who(req);
      return L.send(res, 200, s ? { role: s.role, e: s.e, n: s.n } : { role: '' });
    }
    if (req.method === 'DELETE') {
      const m = /^Bearer ([0-9a-f]{64})$/.exec(req.headers.authorization || '');
      if (m) await L.rc('DEL', 'ak:ses:' + L.hash(m[1]));
      return L.send(res, 200, { ok: true });
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST, DELETE'); return L.send(res, 405, { error: 'Metode tidak didukung' }); }
    const b = req.body && typeof req.body === 'object' ? req.body : {}, e = L.str(b.e, 120).toLowerCase(), p = String(b.p || '').slice(0, 200);
    if (!e || !p) return L.send(res, 200, { ok: false });
    let rec = null, who = null;
    if (e === 'owner') { if (!L.ownerKey()) return L.send(res, 200, { ok: false }); }
    else { const raw = await L.rc('HGET', 'ak:admins', e); if (!raw) return L.send(res, 200, { ok: false }); try { rec = JSON.parse(raw); } catch { return L.send(res, 200, { ok: false }); } }
    const fk = 'ak:rl:fa:' + L.ip(req);
    if ((+(await L.rc('GET', fk)) || 0) >= 10) return L.send(res, 429, { error: 'Terlalu banyak percobaan, tunggu 10 menit' });
    if (rec) {
      const a = crypto.scryptSync(p, rec.s, 64), h = Buffer.from(rec.h, 'hex');
      if (a.length === h.length && crypto.timingSafeEqual(a, h)) who = { role: 'admin', e, n: rec.n };
    } else if (L.eq(p, L.ownerKey())) who = { role: 'owner', e: 'owner', n: 'Owner' };
    if (!who) { if ((await L.rc('INCR', fk)) === 1) await L.rc('EXPIRE', fk, 600); return L.send(res, 200, { ok: false }); }
    const tok = crypto.randomBytes(32).toString('hex');
    await L.rc('SET', 'ak:ses:' + L.hash(tok), JSON.stringify(who), 'EX', TTL);
    L.send(res, 200, { ok: true, tok, role: who.role, e: who.e, n: who.n });
  } catch (e) { L.send(res, 500, { error: 'Kesalahan server' }); }
};
