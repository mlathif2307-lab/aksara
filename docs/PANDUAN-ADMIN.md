# Panduan Owner dan Admin

## Peran

| Peran | Boleh |
| --- | --- |
| **owner** | Semua wewenang admin, ditambah mengangkat dan mencopot admin |
| **admin** | Produk, harga/stok, pesanan, inbox, teks halaman, artikel, keuangan. Tidak bisa mengelola admin lain |

## Login (mode server)

- **Owner:** email `owner`, kata sandi sama dengan `OWNER_KEY`.
- **Admin:** email dan kata sandi awal yang diberikan owner, di formulir login yang sama.
- Sesi berlaku 8 jam dan hanya disimpan di tab peramban.
- Setelah 10 kali gagal dari satu IP, login terkunci 10 menit.

## Mengangkat dan mencopot admin (owner)

1. Login sebagai owner, buka **Panel owner → Staf**.
2. Isi nama, email (dipakai untuk login), dan kata sandi awal (minimal 10 karakter), lalu **Tambah admin**.
3. Berikan email dan kata sandi itu kepada admin yang bersangkutan.
4. Untuk mencopot, klik tanda ✕ di samping nama admin. Sesinya langsung berhenti berlaku.

Batas jumlah admin adalah 50.

## Panel

Satu panel bertab dengan bagian Produk, Pesanan, Inbox, Konten, Artikel, dan Staf (khusus owner).

### Produk, harga, dan stok

- Di **Panel → Produk**, setiap produk punya kolom **Modal** (ribu Rp) yang tidak tampil di katalog.
- Saat login sebagai admin, setiap kartu di Katalog punya kolom harga (ribu Rp) dan stok. Perubahan tersimpan otomatis dan tersinkron ke semua pengunjung.
- Produk baru yang ditambah lewat panel masih lokal. Hanya harga dan stok produk yang ada di `js/data.js` yang disinkronkan.

### Keuangan

**Panel → Keuangan** menghitung laba per unit, margin, nilai stok, potensi laba, BOP bulanan (sewa, listrik, dll.), titik impas (BEP), dan laba dari pesanan yang sudah dibayar. Datanya disimpan lewat `api/finance.js` dan hanya bisa dibaca admin dan owner.

### Inbox

- Pengunjung mengirim pertanyaan dari halaman **Kontak**.
- Admin membalas di **Panel → Inbox**.
- Pengunjung melihat balasan lewat tombol **Inbox** di navigasi. Pesan dan balasan terikat ke peramban yang dipakai mengirim, bukan ke akun.

### Konten

- Teks halaman Tentang dan Kontak diedit di **Panel → Konten**, atau lewat tombol *Edit teks halaman* di halamannya saat login.
- Artikel inspirasi (artikel, skripsi, makalah, jurnal) ditambah atau dihapus di **Panel → Artikel**. Tombol *Buka artikel* di halaman Inspirasi membuka tautan aslinya di tab baru.

## Mode lokal

Tanpa server, akun dan peran disimpan di localStorage, jadi hanya berlaku di peramban itu. Ada dua akun demo bawaan di `js/shop.js`:

| Peran | Email | Catatan |
| --- | --- | --- |
| owner | `owner@aksara.example` | Bisa menambah dan mencopot admin di *Panel → Pengguna* |
| admin | `admin@aksara.example` | Semua wewenang toko, tanpa kelola admin |

Kata sandi demo ada di `js/shop.js`. Di mode server, akun demo tidak punya wewenang apa pun. Ganti kata sandi demo sebelum situs dipublikasikan.
