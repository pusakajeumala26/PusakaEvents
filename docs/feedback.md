# Feedback portfolio

## Alur

Form publik tersedia di `/masukan` dan tautannya ada pada bagian **Umum** di sidebar/drawer. Route `POST /api/feedback` memvalidasi ukuran dan isi request, lalu memanggil helper server-only yang meneruskan hanya nama, peran, instansi, rating, isi masukan, dan konstanta project `PusakaEvents` ke tool `submit_feedback` pada MCP portfolio. Persetujuan dan honeypot tidak diteruskan. Tidak ada masukan yang disimpan ke database PusakaEvent.

Testimoni baru berstatus `pending` di portfolio. Masukan baru ditampilkan setelah Alfiz menyetujuinya. Tidak ada roster, nomor telepon peserta, status kas, atau foto struk yang dibaca maupun dikirim oleh alur ini.

Halaman `/masukan` adalah halaman publik terpisah dari beranda agar alur pembayaran tetap fokus dan form panjang tidak mengganggu ringkasan kas. Service worker mengambil navigasi halaman dari jaringan (offline hanya memakai halaman `/offline`) dan tidak menyimpan `/masukan`; request `/api/feedback` dikecualikan dari cache API.

## Environment

Atur dua variabel server-only berikut di Vercel Production/Preview sesuai kebutuhan dan di `.env.local` untuk development. Jangan gunakan awalan `NEXT_PUBLIC_`.

| Variabel | Nilai |
| --- | --- |
| `PORTFOLIO_MCP_URL` | `https://alfizilham.vercel.app/api/mcp` |
| `PORTFOLIO_MCP_API_KEY` | API key MCP portfolio yang masih aktif |

Jika salah satu variabel kosong, route mengembalikan pesan layanan sementara tidak tersedia dan tidak menghubungi MCP.

## Validasi dan respons

Nama dipangkas dan spasi berulang dirapikan (1–80 karakter); peran dan instansi opsional (maks. 80 karakter); rating bilangan bulat 1–5; isi masukan 5–1500 karakter; persetujuan harus bernilai `true`. Request non-JSON dan body di atas 8 KB ditolak. Pembatas laju adalah 3 kiriman per IP yang di-hash dalam 10 menit.

| Hasil | Respons route | Pesan ke pengguna |
| --- | --- | --- |
| Terkirim dan berstatus `pending` | 200 | Konfirmasi terkirim; akan ditinjau sebelum tampil. |
| Isian ditolak oleh validasi atau MCP | 400 | Periksa kembali isian masukan. |
| Batas laju lokal atau MCP tercapai | 429 + `Retry-After` | Coba lagi setelah jeda. |
| Key tidak sah, layanan gagal, timeout, atau belum dikonfigurasi | 503 | Masukan belum dapat dikirim saat ini. Coba lagi beberapa saat lagi. |
| Honeypot terisi | 200 tanpa panggilan MCP | Respons semu agar bot tidak mendapat sinyal keberhasilan yang berbeda. |

Log aplikasi hanya mencatat kategori hasil (contoh `unavailable`), bukan key, respons MCP, nama, atau isi masukan.

## Privasi dan risiko kirim ganda

Data hanya diteruskan setelah kotak persetujuan dicentang. Pengiriman memakai koneksi server-ke-server; API key tidak dikirim ke browser. Masukan dapat memuat nama, peran, instansi, rating, dan isi yang disetujui untuk ditampilkan di portfolio. Jangan masukkan data peserta, nomor telepon, data pembayaran, atau struk.

MCP tidak menyediakan idempotency key. Timeout dapat terjadi setelah portfolio menerima testimoni, sehingga retry manual mungkin membuat entri pending ganda. Aplikasi tidak melakukan retry otomatis, dan tombol kirim dinonaktifkan selama request berlangsung. Jika hasil tidak jelas, periksa dashboard portfolio sebelum mengirim ulang.

Limiter memakai memori instance serverless sehingga hitungan dapat berbeda antar-instance; ini lapisan pembatas ringan, bukan jaminan global. Untuk perlindungan global, gunakan limiter bersama atau firewall platform.

## Rotasi key

1. Buat key baru di pengelolaan MCP portfolio.
2. Perbarui `PORTFOLIO_MCP_API_KEY` pada environment Vercel yang digunakan dan redeploy.
3. Setelah deploy terverifikasi, cabut key lama di server portfolio.
4. Untuk lokal, ganti nilai di `.env.local` secara manual. Jangan commit atau kirim key melalui chat/log.
