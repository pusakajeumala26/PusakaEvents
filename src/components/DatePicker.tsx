'use client';

import { useState } from 'react';
import { useDialog } from '@/lib/use-dialog';
import { APP_TZ_OFFSET_MS } from '@/lib/constants';
import { Ic } from './Ic';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DOW = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** Pemilih tanggal sebagai modal overlay (bukan popover) agar tidak meluap di layar kecil. */
export function DatePicker({
  value, onPick, onClose,
}: {
  value: string;
  onPick: (yyyyMmDd: string) => void;
  onClose: () => void;
}) {
  const ref = useDialog<HTMLDivElement>(onClose);
  const nowWib = new Date(Date.now() + APP_TZ_OFFSET_MS);
  const todayIso = iso(nowWib.getUTCFullYear(), nowWib.getUTCMonth(), nowWib.getUTCDate());
  const base = value ? value.split('-').map(Number) : [nowWib.getUTCFullYear(), nowWib.getUTCMonth() + 1];
  const [y, setY] = useState(base[0]);
  const [m, setM] = useState(base[1] - 1);
  const [sel, setSel] = useState(value);

  const first = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7; // Senin = 0
  const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const prevDim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: { d: number; mo: number; yr: number; muted: boolean }[] = [];
  for (let i = first - 1; i >= 0; i--) cells.push({ d: prevDim - i, mo: m - 1, yr: y, muted: true });
  for (let d = 1; d <= dim; d++) cells.push({ d, mo: m, yr: y, muted: false });
  while (cells.length % 7 !== 0 || cells.length < 35) cells.push({ d: cells.length - first - dim + 1, mo: m + 1, yr: y, muted: true });

  const shift = (delta: number) => {
    const t = new Date(Date.UTC(y, m + delta, 1));
    setY(t.getUTCFullYear());
    setM(t.getUTCMonth());
  };
  const norm = (c: { d: number; mo: number; yr: number }) => {
    const t = new Date(Date.UTC(c.yr, c.mo, c.d));
    return iso(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
  };

  return (
    <div className="scrim" style={{ alignItems: 'center', padding: 16, zIndex: 90 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cal" role="dialog" aria-modal="true" aria-labelledby="cal-t" ref={ref} tabIndex={-1}>
        <div className="hd">
          <button type="button" className="ib ol" aria-label="Bulan sebelumnya" onClick={() => shift(-1)}><Ic n="i-back" /></button>
          <b id="cal-t" aria-live="polite">{MONTHS[m]} {y}</b>
          <button type="button" className="ib ol" aria-label="Bulan berikutnya" onClick={() => shift(1)}><Ic n="i-chev" /></button>
        </div>
        <div className="g" aria-hidden="true">{DOW.map((d) => <span key={d}>{d}</span>)}</div>
        <div className="g" role="group" aria-label="Pilih tanggal">
          {cells.map((c, i) => {
            const k = norm(c);
            const cls = [c.muted ? 'mu' : '', k === todayIso ? 'td' : '', k === sel ? 'sl' : ''].filter(Boolean).join(' ');
            return (
              <button key={i} type="button" className={cls || undefined} aria-pressed={k === sel} aria-label={k} onClick={() => setSel(k)}>
                {c.d}
              </button>
            );
          })}
        </div>
        <div className="ft">
          <button type="button" className="btn ghost" onClick={() => onPick('')}>Hapus</button>
          <button type="button" className="btn" onClick={onClose}>Batal</button>
          <button type="button" className="btn pri" disabled={!sel} onClick={() => onPick(sel)}>Pilih</button>
        </div>
      </div>
    </div>
  );
}
