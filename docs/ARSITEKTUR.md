# Arsitektur

## Gambaran Umum

AKSARA terdiri dari halaman statis dan lima serverless function. Peramban memanggil `/api/*`, function di Vercel membaca dan menulis data ke Upstash Redis lewat REST.

```mermaid
flowchart LR
    A["Peramban<br/>index.html + js/*"] -->|"fetch /api/* (Bearer token)"| B["Vercel Serverless<br/>api/*.js"]
    B -->|REST| C[("Upstash Redis")]
```

Tidak ada langkah build. Vercel menyajikan berkas statis apa adanya dan mengubah setiap berkas di `api/` (kecuali yang berawalan `_`) menjadi endpoint. Setiap function dibatasi 10 detik (`vercel.json`).

Tanpa variabel Redis, setiap endpoint menjawab `{"configured":false}` dan frontend berjalan dalam **mode lokal** (data di localStorage peramban).

## Endpoint API

| Endpoint | Metode | Akses | Fungsi |
| --- | --- | --- | --- |
| `/api/auth` | `POST` | Publik | Login. Body `{e, p}`. `e="owner"` + `OWNER_KEY` menjadi owner, email admin + kata sandi menjadi admin. Gagal selalu menjawab `{ok:false}` yang sama agar tidak membocorkan siapa admin. |
| | `GET` | Sesi | Cek sesi: `{role, e, n}`. |
| | `DELETE` | Sesi | Keluar (menghapus sesi). |
| `/api/content` | `GET` | Publik | `{configured:true, data:{about, contact, articles, prices}}`. |
| | `PUT` | Admin/owner | Simpan konten (teks Tentang dan Kontak, artikel, harga, stok). Semua input disanitasi dan dibatasi panjangnya. |
| `/api/inbox` | `POST` | Publik | Kirim pertanyaan. Dibatasi 5 pesan per 10 menit per IP, ada honeypot anti-bot, maksimum 2000 pesan. Setiap pesan mendapat token rahasia. |
| | `GET ?ids=id.token,...` | Publik | Pengunjung melihat balasan untuk pesannya sendiri (id dan token harus cocok). |
| | `GET ?all=1` | Admin/owner | Semua pesan (token disembunyikan). |
| | `PATCH` | Admin/owner | Membalas pesan. |
| | `DELETE ?id=` | Admin/owner | Menghapus pesan. |
| `/api/finance` | `GET`, `PUT` | Admin/owner | Modal per produk dan daftar BOP. Tidak pernah dikirim ke pengunjung. |
| `/api/staff` | `GET` | Owner | Daftar admin. |
| | `POST` | Owner | Mengangkat admin `{n, e, p}` (nama ≥ 2 karakter, email valid, kata sandi ≥ 10 karakter, maksimum 50 admin). |
| | `DELETE ?e=` | Owner | Mencopot admin. Sesinya langsung tidak berlaku. |
| (bukan endpoint) | | | `api/_lib.js`: helper bersama. |

## Sesi dan Wewenang

1. Login berhasil menghasilkan token acak 64 karakter heksadesimal. Server hanya menyimpan **hash**-nya di Redis (`ak:ses:<hash>`) selama 8 jam.
2. Klien mengirim token sebagai `Authorization: Bearer <token>`. Token disimpan di tab peramban.
3. `gate(req, res, min)` di `api/_lib.js` memeriksa sesi untuk setiap endpoint terlindung. `min` bernilai `admin` (admin atau owner) atau `owner` (hanya owner).
4. Saat admin dicopot, sesinya otomatis gugur karena `who()` mengecek apakah admin itu masih terdaftar.

## Kunci Redis

| Kunci | Tipe | Isi |
| --- | --- | --- |
| `ak:content` | string (JSON) | Teks Tentang, Kontak, artikel, harga, stok |
| `ak:fin` | string (JSON) | Modal produk dan BOP |
| `ak:msgs` | hash | Pesan inbox |
| `ak:admins` | hash | Akun admin (email → data, kata sandi di-hash scrypt) |
| `ak:ses:*` | string | Sesi aktif (kedaluwarsa 8 jam) |
| `ak:rl:*` | string | Penghitung pembatas laju |

## Keamanan

- **Kata sandi.** Admin di-hash dengan scrypt beserta salt. `OWNER_KEY` dibandingkan dengan `timingSafeEqual`.
- **Pembatasan login.** 10 kegagalan dalam 10 menit dari satu IP mengunci login selama 10 menit (HTTP 429, "Terlalu banyak percobaan").
- **Email tidak peka huruf besar/kecil.** Server mengubahnya menjadi huruf kecil, jadi `Owner` dan `owner` dianggap sama.
- **Server yang menentukan.** Tampilan admin di peramban hanya antarmuka. Setiap penulisan diperiksa wewenangnya di server.
- **Sanitasi input.** Karakter kontrol dibuang, panjang dibatasi, URL hanya `http(s)`.
- **Header keamanan** (`vercel.json`): CSP yang membatasi skrip ke `self` dan cdnjs, `connect-src 'self'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, dan `Referrer-Policy`.
- **Tidak ada cache pada API.** Semua jawaban API memakai `Cache-Control: no-store`.
- **Rahasia di luar repo.** `.env*` dan `.vercel/` masuk `.gitignore`. Hanya `.env.example` yang boleh di-commit.

## Batasan Saat Ini

- Pesanan, keranjang, akun pembeli, dan pembayaran masih simulasi di localStorage dan tidak dibagi antar pengguna. Stok di server tidak berkurang saat pesanan dibuat.
- Produk baru yang ditambah admin lewat panel masih lokal. Hanya harga dan stok produk yang ada di `js/data.js` yang disinkronkan.
- `database/schema.sql` adalah skema PostgreSQL untuk versi backend penuh di masa depan, belum dipakai oleh versi ini.
