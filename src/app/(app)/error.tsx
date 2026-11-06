'use client';

import { Ic } from '@/components/Ic';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="content">
      <div className="empty" role="alert">
        <Ic n="i-alert" size={28} />
        <b>Halaman gagal dimuat</b>
        <p>Server atau database sedang bermasalah. Coba lagi sebentar.</p>
        {error.digest && <p className="num hint">Kode: {error.digest}</p>}
        <button type="button" className="btn pri" onClick={reset}>Coba lagi</button>
      </div>
    </div>
  );
}
