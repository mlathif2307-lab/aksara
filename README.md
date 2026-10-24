# AKSARA — Perjalanan Memasuki Dunia Pengetahuan

Toko buku dan perlengkapan akademik berbasis web. Tampilan statis (HTML, CSS, JavaScript biasa, tanpa langkah build) dengan API serverless di Vercel dan penyimpanan Upstash Redis, sehingga konten, harga, stok, dan inbox dibagi ke semua pengunjung.

[![Hosting: Vercel](https://img.shields.io/badge/hosting-Vercel-000000?logo=vercel&logoColor=white)](https://aksara-iota-gilt.vercel.app)
[![Database: Upstash Redis](https://img.shields.io/badge/database-Upstash%20Redis-00E9A3?logo=redis&logoColor=white)](https://upstash.com)
[![JavaScript](https://img.shields.io/badge/code-JavaScript-F7DF1E?logo=javascript&logoColor=black)](#teknologi)

**Demo:** <https://aksara-iota-gilt.vercel.app>

## Daftar Isi

- [Fitur](#fitur)
- [Teknologi](#teknologi)
- [Struktur Proyek](#struktur-proyek)
- [Memulai](#memulai)
- [Mode Lokal dan Mode Server](#mode-lokal-dan-mode-server)
- [Variabel Lingkungan](#variabel-lingkungan)
- [Peran Pengguna](#peran-pengguna)
- [Mengedit Konten](#mengedit-konten)
- [Dokumentasi](#dokumentasi)
- [Tim](#tim)

## Fitur

- **Delapan halaman** dalam satu `index.html`, dipilih lewat hash: beranda, katalog, paket, buyback, kustom, inspirasi, tentang, kontak.
- **Beranda interaktif:** animasi buku 3D (Three.js), HUD, pena tinta, hitung mundur, dan form pre order.
- **Katalog** produk per kategori dan jurusan, dengan keranjang dan pembayaran simulasi.
- **Inspirasi karya ilmiah:** daftar artikel, skripsi, makalah, dan jurnal, dengan asisten rekomendasi berbasis aturan (Sobat Suki).
- **Inbox:** pengunjung bertanya lewat halaman Kontak, admin membalas dari panel.
- **Panel bertab** untuk admin dan owner: produk, pesanan, inbox, konten, artikel, staf.
- **Keuangan:** modal produk, laba per unit, margin, nilai stok, BOP bulanan, dan titik impas (BEP). Data ini hanya bisa dibaca admin dan owner.
- **Harga dan stok langsung:** admin mengubahnya dari kartu katalog, dan perubahan tersinkron ke semua pengunjung.

## Teknologi

| Lapisan | Teknologi |
| --- | --- |
| Frontend | HTML, CSS, JavaScript biasa. Three.js r128 (CDN) untuk animasi 3D |
| Backend | Vercel Serverless Functions (folder `api/`, Node.js 18+) |
| Database | Upstash Redis lewat REST |
| Hosting | Vercel |

## Struktur Proyek

```
aksara/
├── index.html             # Kerangka halaman (8 halaman, dipilih lewat #hash)
├── css/
│   └── style.css          # Semua gaya; warna utama ada di :root
├── js/
│   ├── hero.js            # Animasi buku 3D, HUD, pena tinta, hitung mundur, pre order
│   ├── data.js            # Data produk, kategori, jurusan, daftar buyback
│   ├── extra.js           # Tentang, Kontak + inbox admin, Inspirasi, edit harga/stok, rekomendasi
│   └── shop.js            # Toko, akun, panel admin, pembayaran simulasi
├── api/                   # Serverless functions (otomatis jadi /api/*)
│   ├── _lib.js            # Helper bersama: Redis, sesi, peran, pembatas laju (bukan endpoint)
│   ├── auth.js            # Login, cek sesi, logout
│   ├── content.js         # Konten publik, harga, stok
│   ├── finance.js         # Modal produk dan BOP (admin/owner)
│   ├── inbox.js           # Pesan pengunjung dan balasan
│   └── staff.js           # Kelola admin (owner)
├── database/
│   └── schema.sql         # Skema PostgreSQL untuk versi backend penuh (referensi)
├── img/                   # Foto produk
├── docs/
│   ├── ARSITEKTUR.md      # Arsitektur, endpoint, kunci Redis, keamanan
│   ├── DEPLOY.md          # Deploy dan pemecahan masalah
│   └── PANDUAN-ADMIN.md   # Panduan owner dan admin
├── vercel.json            # Header keamanan (CSP, X-Frame-Options, dll.)
├── package.json
├── .env.example           # Contoh variabel lingkungan (tanpa nilai asli)
├── CONTRIBUTING.md        # Panduan kerja tim
└── README.md
```

## Memulai

Prasyarat: [Node.js](https://nodejs.org) 18 atau lebih baru dan [Git](https://git-scm.com).

```bash
git clone https://github.com/mlathif2307-lab/aksara.git
cd aksara
npm run dev        # sama dengan: npx serve .
```

Buka alamat yang tertera. Jangan membuka `index.html` dengan klik ganda, gunakan server lokal.

`npm run dev` menjalankan **mode lokal** (tanpa API). Untuk mencoba API dan penyimpanan bersama, pakai `npx vercel dev` (lihat bagian berikut).

## Mode Lokal dan Mode Server

| | Mode lokal | Mode server |
| --- | --- | --- |
| Cara menjalankan | `npm run dev` | `npx vercel dev` atau situs yang sudah di-deploy |
| Data tersimpan di | localStorage peramban masing-masing | Upstash Redis, dibagi ke semua pengunjung |
| Syarat | Tidak ada | Variabel lingkungan terisi (lihat di bawah) |
| Akun | Akun demo di peramban | Owner lewat `OWNER_KEY`, admin dibuat owner |
| Cocok untuk | Uji coba tampilan | Situs yang dipublikasikan |

Pesanan, keranjang, akun pembeli, dan pembayaran tetap **simulasi di peramban** di kedua mode, jadi belum cocok untuk transaksi sungguhan. Untuk toko sungguhan, data perlu dipindah ke backend penuh. Skemanya ada di `database/schema.sql`.

Untuk mode server di komputermu sendiri:

```bash
cp .env.example .env.local        # Windows PowerShell: Copy-Item .env.example .env.local
# isi OWNER_KEY, KV_REST_API_URL, KV_REST_API_TOKEN
npx vercel dev                    # akan meminta login dan menautkan ke proyek Vercel milikmu
```

## Variabel Lingkungan

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `OWNER_KEY` | Ya (mode server) | Kata sandi owner. Acak, minimal 24 karakter. `ADMIN_KEY` lama masih diterima sebagai alias. |
| `KV_REST_API_URL` | Ya (mode server) | URL REST Upstash Redis. Alternatif: `UPSTASH_REDIS_REST_URL`. |
| `KV_REST_API_TOKEN` | Ya (mode server) | Token REST Upstash Redis. Alternatif: `UPSTASH_REDIS_REST_TOKEN`. |

Tanpa variabel Redis, semua endpoint menjawab `{"configured":false}` dan situs berjalan dalam mode lokal.

## Peran Pengguna

| Peran | Boleh |
| --- | --- |
| **user** | Belanja, mengirim pertanyaan, membaca balasan |
| **admin** | Urusan toko: produk, harga/stok, pesanan, inbox, teks halaman, artikel, keuangan. Tidak bisa mengangkat atau mencopot admin |
| **owner** | Semua wewenang admin, ditambah mengangkat dan mencopot admin |

Login owner: email `owner`, kata sandi sama dengan `OWNER_KEY`. Detail lengkap ada di [docs/PANDUAN-ADMIN.md](docs/PANDUAN-ADMIN.md).

## Mengedit Konten

- **Produk:** ubah `js/data.js` (format baris dijelaskan di komentar). Untuk foto asli, isi elemen ke-11 dengan `img/namafile.jpg`.
- **Teks, warna, ukuran:** `index.html` dan `css/style.css`.
- **Setelah mengubah data produk,** bersihkan localStorage peramban agar data baru terbaca.
- **Teks Tentang dan Kontak, artikel, harga, stok:** diedit dari panel saat login sebagai admin atau owner, tanpa menyentuh kode.

## Dokumentasi

- [Arsitektur, endpoint API, kunci Redis, dan keamanan](docs/ARSITEKTUR.md)
- [Deploy dan pemecahan masalah](docs/DEPLOY.md)
- [Panduan owner dan admin](docs/PANDUAN-ADMIN.md)
- [Panduan kontribusi tim](CONTRIBUTING.md)

## Tim

| GitHub | Peran |
| --- | --- |
| [@mlathif2307-lab](https://github.com/mlathif2307-lab) | Pemilik repo |
| [@afzaljodityavieri](https://github.com/afzaljodityavieri) | Kolaborator |
| [@adityayosafat](https://github.com/adityayosafat) | Kolaborator |

## Lisensi

Hak cipta © 2026 Tim AKSARA. Semua hak dilindungi.
