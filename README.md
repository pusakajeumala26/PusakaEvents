<p align="center">
  <img src="public/brand/logo.webp" alt="PusakaEvent" width="120">
</p>

<h1 align="center">PusakaEvent</h1>

<p align="center">
  PWA monokrom untuk rekap kas jangka panjang leting <b>Pusaka Jeumala</b> dengan verifikasi struk transfer.<br>
  Next.js 15 &middot; Prisma + NeonDB &middot; Neon Object Storage (S3) &middot; Vercel
</p>

---

## Fitur

- Anggota mendaftar sendiri (nama, no. HP/WA, subjek, gender, password) dan langsung mengunggah struk. Status: **Menunggu**.
- Admin juga bisa mengimpor anggota lewat Excel (.xlsx), CSV, atau JSON. Mereka berstatus **Belum input** dan membuat password sendiri lewat "Buka data saya".
- Admin memeriksa struk: **Setujui** (Terverifikasi) atau **Tolak** dengan alasan wajib (Ditolak) dan tautan WhatsApp siap kirim (`wa.me`, bukan otomatis).
- Anggota yang ditolak membuka datanya dengan nomor HP + password, lalu mengirim ulang struk (kembali ke Menunggu).
- Rekap kas, ekspor CSV/JSON, rekening tujuan (ada tombol salin), kontak pengurus.
- Admin dapat mengarsipkan dan menutup periode event. ZIP dibuat di browser sebelum status anggota direset; struk dan histori event periode berjalan dibersihkan dari storage/database.
- PWA: tombol Instal di sidebar untuk semua orang (panduan khusus iPhone), halaman offline, splash, skeleton, dropdown/scrollbar kustom, date picker modal.
- Status selalu tampil dengan label + ikon, tidak hanya warna.

## Status struk

| Status | Arti |
| --- | --- |
| Terverifikasi | Struk disetujui admin |
| Menunggu | Struk sudah diunggah, belum diperiksa |
| Ditolak | Struk ditolak, ada alasan, anggota perlu mengirim ulang |
| Belum input | Anggota ada (impor admin) tetapi belum mengunggah struk |

## Penyimpanan struk (Neon Object Storage)

Struk diubah ke WebP di browser, divalidasi ulang di server (sharp), lalu disimpan di bucket **private** Neon Object Storage (kompatibel S3). Tidak ada URL publik: struk hanya dibaca lewat `GET /api/members/[id]/receipt`, yang memeriksa sesi admin atau pemilik struk.

## Setup

### 1. Database (NeonDB)

1. Buat project Neon (disarankan region **Singapore / ap-southeast-1**, sama dengan storage).
2. Salin dua connection string: **pooled** untuk `DATABASE_URL` dan **direct** untuk `DIRECT_URL`.

### 2. Storage (Neon Object Storage)

Pakai Neon CLI (`npm i -g neonctl`, lalu `neon auth`):

```bash
neon link                                  # pilih project + branch
neon buckets create struk-kas              # bucket private
neon credentials create --scope storage:read --scope storage:write
```

Perintah terakhir menampilkan `token_id` (nak_live_...) dan secret (nsk_live_...). **Secret hanya tampil sekali, simpan segera.** Endpoint bucket diambil dari:

```bash
curl "https://console.neon.tech/api/v2/projects/<PROJECT_ID>/branches/<BRANCH_ID>/storage" \
  -H "Authorization: Bearer $NEON_API_KEY"
```

Ambil `s3_endpoint` dan `region` dari balasannya. Isi ke env:

| Env | Isi |
| --- | --- |
| `AWS_ACCESS_KEY_ID` | `token_id` (nak_live_...) |
| `AWS_SECRET_ACCESS_KEY` | secret (nsk_live_...) |
| `AWS_ENDPOINT_URL_S3` | `s3_endpoint` |
| `AWS_REGION` | `region`, mis. `ap-southeast-1` |
| `STORAGE_BUCKET` | `struk-kas` |

### 3. Env lain

| Env | Isi |
| --- | --- |
| `ADMIN_PASSWORD` | password admin awal (ganti lewat Pengaturan setelah masuk) |
| `SESSION_SECRET` | acak panjang: `openssl rand -base64 32` |
| `PORTFOLIO_MCP_URL` | endpoint server MCP portfolio; hanya server |
| `PORTFOLIO_MCP_API_KEY` | key MCP portfolio; hanya server, jangan gunakan `NEXT_PUBLIC_` |

Feedback portfolio memakai `PORTFOLIO_MCP_URL` dan `PORTFOLIO_MCP_API_KEY`, hanya di server. Atur keduanya di environment Vercel (dan `.env.local` untuk development). Lihat [docs/feedback.md](docs/feedback.md) untuk alur, privasi, serta rotasi key.

Salin `.env.example` ke `.env.local` untuk dev lokal.

### 4. Migrasi database

```bash
npm install
npx prisma migrate deploy
```

Perintah tersebut menerapkan migrasi ke database pada `DIRECT_URL` lingkungan yang sedang digunakan. Jangan arahkan perintah lokal ke database production; deploy Vercel akan menjalankan `prisma migrate deploy` saat build.

### 5. Jalankan lokal

```bash
npm run dev
```

## Deploy ke Vercel

1. Import repo di Vercel. Framework: Next.js. Build/Install command biarkan default (`npm run build` menjalankan `prisma generate`, `prisma migrate deploy`, lalu `next build`).
2. Isi **semua env** di atas (Production, Preview, Development).
3. Deploy. Vercel menerapkan migrasi yang belum berjalan sebelum membangun aplikasi.
4. Buka situs, masuk admin lewat menu **Masuk admin**, dan ubah password di Pengaturan.
5. Cek halaman Pengaturan: nominal, target, bank, rekening, atas nama (nilai awal: BSI 7366090325 a.n. Raisya Zumara).

## Sesi admin

Sesi admin berlaku 30 menit. Saat tersisa 30 detik, aplikasi menampilkan dialog untuk memperpanjang sesi 30 menit atau keluar. Perpanjangan dan logout disinkronkan antar-tab; server tetap memvalidasi JWT dan versi password pada setiap endpoint admin.

## Menutup periode event

1. Masuk ke **Pengaturan** setelah memastikan password admin sudah diganti dan tersimpan sebagai hash.
2. Pada bagian **Tutup periode event**, periksa jumlah anggota, status, kas terverifikasi, jumlah struk, dan ukuran storage.
3. Isi nama periode, nominal, target, serta tenggat opsional untuk periode berikutnya. Pendaftaran periode baru tetap ditutup sampai dibuka kembali dari pengaturan.
4. Buat ZIP dan tunggu semua struk selesai diunduh. Periksa file ZIP dan simpan di tempat aman sebelum melanjutkan.
5. Centang konfirmasi, ketik nama periode lama persis, lalu masukkan ulang password admin untuk menutup periode.
6. Setelah transaksi tersimpan, aplikasi menghapus seluruh objek pada prefix `struk/`. Jika storage menolak sebagian operasi, riwayat menandai pembersihan tertunda dan menyediakan **Ulangi pembersihan**.

Arsip berisi `rekap.csv`, `anggota.json`, `ringkasan.json`, dan file struk pada folder `struk/`. Arsip dibuat di browser, sehingga pastikan perangkat memiliki ruang dan koneksi yang cukup. Jangan tutup dialog selama progress unduh berjalan. Setiap unduhan struk yang gagal menghentikan pembuatan arsip dan penutupan periode.

## Catatan keamanan

- Password anggota dan admin di-hash dengan bcrypt. Sesi memakai cookie httpOnly bertanda tangan (JWT).
- Pembatas laju login/daftar tersimpan di memori per instance serverless: cukup untuk komunitas kecil, bukan perlindungan ketat. Untuk yang ketat, pakai Vercel Firewall atau Upstash.
- Anggota hasil impor belum punya password; siapa pun yang tahu nomor HP-nya bisa membuatnya lebih dulu lewat "Buka data saya". Cocok untuk leting tertutup; jika perlu lebih ketat, bagikan password awal lewat WhatsApp.
- Struk tidak pernah di-cache oleh service worker.

## Lisensi

Hak cipta (c) 2026 Pusaka Jeumala. All Rights Reserved. Lihat [LICENSE](LICENSE).
