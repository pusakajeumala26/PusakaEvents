'use client';

import { useState } from 'react';
import { usePwaInstall } from '@/lib/pwa';
import { useDialog } from '@/lib/use-dialog';
import { Ic } from './Ic';
import { useToast } from './ToastProvider';

/** Tombol "Instal aplikasi" untuk semua orang (di bawah sidebar / menu). Tersembunyi jika sudah terpasang. */
export function InstallButton() {
  const { installed, install } = usePwaInstall();
  const toast = useToast();
  const [help, setHelp] = useState<'ios' | 'manual' | null>(null);
  if (installed) return null;

  const onClick = async () => {
    const r = await install();
    if (r === 'ios' || r === 'manual') setHelp(r);
    else if (r === 'accepted') toast('Aplikasi terpasang.');
  };

  return (
    <>
      <button type="button" className="btn ghost blk" onClick={onClick}>
        <Ic n="i-download" />Instal aplikasi
      </button>
      {help && <InstallHelp kind={help} onClose={() => setHelp(null)} />}
    </>
  );
}

function InstallHelp({ kind, onClose }: { kind: 'ios' | 'manual'; onClose: () => void }) {
  const ref = useDialog<HTMLDivElement>(onClose);
  return (
    <div className="scrim" style={{ alignItems: 'center', padding: 16, zIndex: 90 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cal" role="dialog" aria-modal="true" aria-labelledby="ih-t" ref={ref} tabIndex={-1}>
        <div className="hd">
          <b id="ih-t">Instal PusakaEvent</b>
          <button type="button" className="ib ol" aria-label="Tutup" onClick={onClose}><Ic n="i-x" /></button>
        </div>
        {kind === 'ios' ? (
          <>
            <p className="sub">Di iPhone dan iPad, instal lewat Safari:</p>
            <ol className="steps">
              <li>Ketuk tombol <b>Bagikan</b> di bilah Safari.</li>
              <li>Pilih <b>Tambahkan ke Layar Utama</b>.</li>
              <li>Ketuk <b>Tambah</b>.</li>
            </ol>
          </>
        ) : (
          <>
            <p className="sub">Browser ini belum menawarkan instal otomatis. Coba salah satu:</p>
            <ol className="steps">
              <li>Chrome / Edge: buka menu browser, pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b>.</li>
              <li>Pastikan halaman dibuka lewat alamat https dan bukan mode penyamaran.</li>
            </ol>
          </>
        )}
        <button type="button" className="btn pri blk" onClick={onClose}>Mengerti</button>
      </div>
    </div>
  );
}
