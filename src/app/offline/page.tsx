import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Offline' };
export const dynamic = 'force-static';

export default function OfflinePage() {
  return (
    <main className="offline">
      <div>
        <img src="/brand/logo.webp?v=3" alt="" width={72} height={72} />
        <h1>Kamu sedang offline</h1>
        <p className="sub">PusakaEvent butuh internet untuk memuat dan mengirim data. Sambungkan kembali lalu coba lagi.</p>
        {/* Tautan biasa, bukan <Link>: halaman ini bisa tampil dari cache tanpa JavaScript */}
        <a className="btn pri" href="/">Muat ulang</a>
      </div>
    </main>
  );
}
