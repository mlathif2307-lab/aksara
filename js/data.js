/* DATA TOKO — edit di sini.
   Baris produk SEED: [id, nama, kategori, harga (dalam RIBU rupiah), stok, fakultas, [semester min, maks], jurusan, ikon(tidak dipakai), spesifikasi, foto(opsional)]
   Foto asli: taruh file di folder img/ lalu isi elemen ke-11, mis. 'img/algoritma.jpg'. Tanpa foto, dipakai gambar vektor.
   Setelah mengubah data, bersihkan localStorage peramban (DevTools > Application > Clear site data). */
const CATS=['FTI','FEB','Umum Akademik','Custom','Buku'],MJ={FTI:['Teknik Informatika','Sistem Informasi','Sains Data'],FEB:['S-1 Akuntansi','S-1 Manajemen','S-1 Ekonomi Syariah']},ST={Pending:'Menunggu bayar',Paid:'Dibayar',Shipped:'Dikirim',Completed:'Selesai'};
// harga dalam ribu rupiah. [id,nama,kategori,harga,stok,fakultas,[smt min,max],jurusan,ikon,spesifikasi]
const SEED=[['p1','Algoritma & Struktur Data','Buku',95,20,'FTI',[1,4],'','📘','Hardcover, 520 hlm, edisi 5'],['p2','Basis Data Relasional','Buku',88,15,'FTI',[3,6],'Sistem Informasi,Teknik Informatika','📗','Paperback, 430 hlm, SQL & ERD'],['p3','Statistika untuk Sains Data','Buku',92,12,'FTI',[2,6],'Sains Data','📙','Paperback, 480 hlm, contoh Python'],['p4','Set Gambar Teknik & Matematika','FTI',120,25,'FTI',[1,8],'','📐','Penggaris, jangka, busur'],['p5','Pengantar Akuntansi','Buku',85,18,'FEB',[1,3],'S-1 Akuntansi,S-1 Manajemen','📕','Paperback, 400 hlm, edisi 4'],['p6','Fikih Muamalah Kontemporer','Buku',78,10,'FEB',[2,6],'S-1 Ekonomi Syariah','📓','Paperback, 350 hlm'],['p7','Buku Besar Akuntansi','FEB',45,40,'FEB',[1,8],'','📒','Folio 100 lembar, kolom debit-kredit'],['p8','Kalkulator','FEB',280,8,'FEB',[1,8],'','🧮','Fungsi NPV, IRR, amortisasi'],['p9','Pilot G2 0.5 Set 12','Umum Akademik',36,60,'',[1,8],'','🖊️','Isi 12 pcs, gel 0,5 mm, tinta hitam atau biru'],['p10','Highlighter Pastel','Umum Akademik',28,50,'',[1,8],'','🖍️','Set 6 warna'],['p11','Buku Catatan Kustom','Custom',65,30,'',[1,8],'','📔','A5, 120 lembar, sampul gotik'],['p12','Parker Jotter Custom','Custom',85,25,'',[1,8],'','✒️','Badan logam, tinta hitam, nama sesuai pesananmu'],['p16','Snowman V5 Set 12','Umum Akademik',36,80,'',[1,8],'','🖊️','Isi 12 pcs, ujung 0,7 mm, tinta hitam, biru, atau merah']];
const BB=[['9786020001','Algoritma & Struktur Data',95],['9786020002','Pengantar Akuntansi',85],['9786020003','Basis Data Relasional',88],['9786020004','Kalkulus 1',90],['9786020005','Manajemen Keuangan',92]];

/* ===== KONTEN HALAMAN BARU (nilai awal) =====
   Teks Tentang/Kontak dan daftar artikel inspirasi bisa diubah admin langsung dari website (Panel admin).
   Isi di bawah hanya dipakai saat belum ada data tersimpan. Ganti email/WA/alamat dengan data asli tokomu.
   Jenis artikel: Skripsi, Makalah, Jurnal, Artikel, Portal. Bidang: FTI, FEB, Umum. */
const DEF={
 about:{t:'Cerita di balik rak kami.',i:'AKSARA dibuat untuk mahasiswa yang capek keliling toko demi cari buku dan alat tulis yang pas.',
  ps:['Di sini buku, alat tulis, dan paket semester sudah dikelompokkan per fakultas, jurusan, dan semester. Kamu tinggal pilih, tanpa perlu menebak-nebak.','Selain jualan, kami bantu hal lain yang sering dibutuhkan mahasiswa: tukar buku bekas jadi kredit belanja, bikin alat tulis custom, sampai cari referensi untuk tugas dan skripsi.'],
  v:[{t:'Dipilih dengan teliti',d:'Setiap produk ada di sini karena memang dipakai di kelas.'},{t:'Ramah di kantong',d:'Paket semester dan tukar buku bekas membantu menghemat biaya kuliah.'},{t:'Bisa ditanya langsung',d:'Kirim pertanyaanmu, tim kami yang membalas.'}]},
 contact:{t:'Ada yang ingin ditanyakan?',i:'Tanya apa saja soal website, pesanan, atau pembayaran. Jawaban dari admin akan muncul di Inbox dan di bagian “Pesan saya” di bawah.',
  em:'halo@aksara.example',wa:'+62 812-0000-0000',ad:'Alamat toko belum diisi (ubah lewat Panel admin)',jam:'Senin–Jumat, 09.00–17.00 WIB'},
 articles:[
  {id:'a1',t:'Garuda — Garda Rujukan Digital',j:'Portal',b:'Umum',y:2024,s:'garuda.kemdikbud.go.id',u:'https://garuda.kemdikbud.go.id/',k:'jurnal indonesia skripsi referensi'},
  {id:'a2',t:'Neliti — repositori karya ilmiah Indonesia',j:'Portal',b:'Umum',y:2024,s:'neliti.com',u:'https://www.neliti.com/',k:'jurnal makalah penelitian indonesia'},
  {id:'a3',t:'DOAJ — direktori jurnal akses terbuka',j:'Portal',b:'Umum',y:2024,s:'doaj.org',u:'https://doaj.org/',k:'jurnal open access internasional'},
  {id:'a4',t:'arXiv — pracetak ilmu komputer & statistika',j:'Portal',b:'FTI',y:2024,s:'arxiv.org',u:'https://arxiv.org/',k:'informatika data sains komputer algoritma machine learning'},
  {id:'a5',t:'SSRN — makalah kerja ekonomi, akuntansi & keuangan',j:'Portal',b:'FEB',y:2024,s:'ssrn.com',u:'https://www.ssrn.com/',k:'ekonomi akuntansi manajemen keuangan syariah'},
  {id:'a6',t:'Google Scholar — pencarian literatur akademik',j:'Portal',b:'Umum',y:2024,s:'scholar.google.com',u:'https://scholar.google.com/',k:'cari literatur sitasi'}]
};
