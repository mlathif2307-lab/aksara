# Panduan Deploy

Panduan ini untuk pemilik repo yang men-deploy AKSARA ke Vercel.

## Prasyarat

- Akun [Vercel](https://vercel.com) dan [Upstash](https://upstash.com) (paket Free cukup).
- [Node.js](https://nodejs.org) 18 atau lebih baru.
- Vercel CLI:
  ```bash
  npm i -g vercel
  vercel login
  ```

Jalankan semua perintah di folder proyek, yaitu folder yang berisi `index.html`, `vercel.json`, dan `api/`.

## 1. Tautkan proyek

```bash
vercel link
```

Framework preset: **Other**. Build command dan output directory dikosongkan.

## 2. Buat database Redis

1. Buka proyek di dashboard Vercel, tab **Storage**.
2. **Create Database**, pilih **Upstash**, lalu produk **Redis**.
3. Paket **Free**, region terdekat dengan pengunjung (misalnya Singapore). Biarkan **Eviction** mati agar data tidak terhapus otomatis.
4. Saat menyambungkan ke proyek, pilih environment **Production** dan isi **Custom Environment Variable Prefix** dengan `KV`, sehingga variabelnya bernama `KV_REST_API_URL` dan `KV_REST_API_TOKEN`.

## 3. Buat `OWNER_KEY`

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
vercel env add OWNER_KEY production
```

Simpan hasilnya di pengelola kata sandi, lalu tempel persis sama, tanpa spasi di ujung.

## 4. Deploy

```bash
vercel --prod
```

Variabel lingkungan yang baru ditambah hanya terbaca oleh deploy berikutnya, jadi selalu deploy ulang setelah mengubahnya.

## 5. Verifikasi

Buka `https://<domain-kamu>/api/content` di peramban.

| Hasil | Arti |
| --- | --- |
| `{"configured":true,"data":{...}}` | Redis terhubung. |
| `{"configured":false}` | Variabel Redis belum terbaca. Cek langkah 2 dan 4. |
| 404 | Folder `api` tidak ikut ter-deploy. Deploy dari folder yang berisi `index.html` dan `api`. |

## 6. Login pertama

1. Buka situs, pilih **Masuk**.
2. Email: `owner`. Kata sandi: isi `OWNER_KEY`.
3. Buka *Panel owner → Staf* untuk mengangkat admin. Panduannya ada di [PANDUAN-ADMIN.md](PANDUAN-ADMIN.md).

## Pemecahan Masalah

| Masalah | Penyebab dan solusi |
| --- | --- |
| Login owner gagal | `OWNER_KEY` di Vercel berbeda dengan yang diketik. Buat ulang (langkah 3) dan deploy ulang. |
| `A variable with the name OWNER_KEY already exists` | Hapus dulu: `vercel env rm OWNER_KEY production`, lalu `vercel env add` lagi. |
| Variabel Redis tidak muncul | Cek **Settings → Environment Variables**. Kalau awalannya bukan `KV_`, sambungkan ulang database dengan prefix `KV`. |
| "Terlalu banyak percobaan, tunggu 10 menit" | 10 kali gagal login dari satu IP. Tunggu 10 menit. |
| Perubahan variabel tidak berefek | Deploy ulang dengan `vercel --prod`. |
| Inbox dan edit admin tidak terlihat pengunjung lain | Situs masih mode lokal. Pastikan `/api/content` menjawab `configured:true`. |
| Halaman meminta login Vercel | *Deployment Protection* aktif untuk URL deploy tertentu. Gunakan domain produksi, atau atur di **Settings → Deployment Protection**. |

## Keamanan Rahasia

- Jangan pernah meng-commit `.env.local` atau menempelkan token/kunci ke chat, issue, atau Pull Request.
- Jika rahasia bocor, ganti segera: buat ulang `OWNER_KEY` dan rotasi token di dashboard Upstash.
- Ganti kata sandi akun di `js/shop.js` (bagian boot di paling bawah) sebelum situs dipublikasikan. Akun demo hanya berlaku di mode lokal, tetapi sebaiknya tidak memakai kata sandi bawaan.
