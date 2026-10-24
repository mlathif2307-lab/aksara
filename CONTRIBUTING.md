# Panduan Kontribusi

Terima kasih sudah ikut mengembangkan AKSARA. Dokumen ini menjelaskan cara kerja bersama agar riwayat repo tetap rapi dan rahasia tidak bocor.

## 1. Persiapan

1. Terima undangan kolaborator dari pemilik repo (`mlathif2307-lab`) lewat email atau notifikasi GitHub.
2. Clone repo:
   ```bash
   git clone https://github.com/mlathif2307-lab/aksara.git
   cd aksara
   ```
3. Jalankan lokal:
   ```bash
   npm run dev
   ```
   Ini menjalankan **mode lokal** (data di localStorage), cukup untuk pekerjaan tampilan. Untuk menguji API (inbox, login staf, keuangan, dll.), jalankan `npx vercel dev` dengan `.env.local` berisi `OWNER_KEY` dan kredensial Upstash milikmu sendiri. Lihat bagian *Mode Lokal dan Mode Server* di [README](README.md). Tidak perlu meminta rahasia produksi.

## 2. Alur Kerja

Jangan push langsung ke `main`. Selalu lewat branch dan Pull Request.

```bash
git checkout main
git pull
git checkout -b fitur/nama-singkat
# ...kerjakan perubahan...
git add .
git commit -m "feat: tambah filter produk di katalog"
git push -u origin fitur/nama-singkat
```

Lalu buka Pull Request ke `main` dan minta minimal satu anggota lain untuk meninjau sebelum di-merge.

### Penamaan branch

| Awalan | Untuk |
| --- | --- |
| `fitur/` | Fitur baru |
| `perbaikan/` | Perbaikan bug |
| `docs/` | Perubahan dokumentasi |

### Pesan commit

Awali dengan salah satu kata berikut, diikuti kalimat singkat dalam bahasa Indonesia:

| Awalan | Arti |
| --- | --- |
| `feat:` | Fitur baru |
| `fix:` | Perbaikan bug |
| `docs:` | Dokumentasi |
| `style:` | Tampilan atau format, tanpa perubahan logika |
| `refactor:` | Perapian kode tanpa mengubah perilaku |
| `chore:` | Pekerjaan pendukung (konfigurasi, dll.) |

## 3. Area yang Perlu Hati-hati

- **`api/`:** semua pemeriksaan wewenang terjadi di server (`gate()` di `api/_lib.js`). Tampilan admin di peramban hanya antarmuka. Jangan memindahkan pemeriksaan wewenang ke sisi klien.
- **`api/finance.js`:** data modal dan BOP tidak boleh sampai ke pengunjung.
- **`vercel.json`:** CSP membatasi sumber skrip dan koneksi. Menambah CDN atau domain API baru berarti memperbarui CSP.
- **`js/data.js`:** mengubah data produk membuat localStorage lama perlu dibersihkan agar perubahan terbaca.

## 4. Aturan Rahasia

- Jangan meng-commit `.env`, `.env.local`, token, atau kunci apa pun. `.env.example` hanya boleh berisi nama variabel dan nilai contoh.
- Jangan menulis kata sandi asli di kode. Akun demo di `js/shop.js` hanya berlaku di mode lokal.
- Sebelum commit, cek isi yang akan dikirim:
  ```bash
  git status --short
  ```
- Kalau rahasia terlanjur ter-push, anggap sudah bocor: ganti kunci/token tersebut dan beri tahu pemilik repo. Menghapus commit saja tidak cukup.

## 5. Deploy

Deploy produksi dilakukan oleh pemilik repo lewat `vercel --prod`. Detailnya ada di [docs/DEPLOY.md](docs/DEPLOY.md).

## 6. Checklist Pull Request

- [ ] Sudah dicoba secara lokal
- [ ] Tidak ada rahasia atau berkas lokal yang ikut ter-commit
- [ ] Dokumentasi diperbarui jika perilaku atau konfigurasi berubah
- [ ] Deskripsi PR menjelaskan apa yang berubah dan alasannya
