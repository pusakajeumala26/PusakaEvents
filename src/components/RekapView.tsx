'use client';

import { useEffect, useState } from 'react';
import { idWa, initials, rupiah, whatsappLink } from '@/lib/format';
import type { MemberView, PayInfo, Rekap } from '@/lib/types';
import { PageHeader } from './AppShell';
import { StatusChip } from './HomeView';
import { Ic } from './Ic';

export function RekapView({ rekap, unpaid, pay }: { rekap: Rekap; unpaid: MemberView[]; pay: PayInfo }) {
  const c = rekap.counts;
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);

  const reminder = (m: MemberView) =>
    `Halo ${m.name.split(' ')[0]}, pengingat kas leting ${rupiah(pay.amount)} (sekali bayar). Transfer ke ${pay.bankName} ${pay.accountNumber} a.n. ${pay.accountName}, lalu upload struknya lewat PusakaEvent${origin ? ` (${origin})` : ''}. Terima kasih.`;

  const kpis = [
    { k: 'Terkumpul', v: rupiah(rekap.collected), s: `${c.TERVERIFIKASI} lunas`, dk: true },
    { k: 'Menunggu', v: rupiah(rekap.pending), s: `${c.MENUNGGU} struk` },
    { k: 'Target', v: rupiah(rekap.goal), s: `${rekap.target} anggota` },
    { k: 'Kekurangan', v: rupiah(rekap.shortfall), s: `${Math.max(0, rekap.target - c.TERVERIFIKASI)} anggota` },
  ];
  const seg = [
    { cls: 's-ok', n: c.TERVERIFIKASI, label: 'Verifikasi' },
    { cls: 's-pe', n: c.MENUNGGU, label: 'Menunggu' },
    { cls: 's-rj', n: c.DITOLAK, label: 'Ditolak' },
    { cls: 's-no', n: c.BELUM, label: 'Belum' },
  ];

  return (
    <>
      <PageHeader title="Rekap kas" sub="Dihitung dari struk yang sudah terverifikasi" mobileSub="Dari struk terverifikasi" admin />
      <div className="content">
        <section className="kpis" aria-label="Ringkasan kas">
          {kpis.map((x) => (
            <div key={x.k} className={`kpi${x.dk ? ' dk' : ''}`}>
              <span className="k">{x.k}</span><span className="v num">{x.v}</span><span className="k num">{x.s}</span>
            </div>
          ))}
        </section>
        <section className="card">
          <h2>Progres pengumpulan</h2>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="num" style={{ fontSize: 36, fontWeight: 650, letterSpacing: '-.03em' }}>{rekap.pct}%</span>
            <span className="sub">terkumpul</span>
          </div>
          <div className="seg" style={{ height: 16 }} role="img" aria-label={seg.map((s) => `${s.n} ${s.label.toLowerCase()}`).join(', ')}>
            {seg.filter((s) => s.n > 0).map((s) => <i key={s.cls} className={s.cls} style={{ flex: s.n }} />)}
          </div>
          <div className="lg">{seg.map((s) => <span key={s.cls}><i className={s.cls} />{s.n} {s.label}</span>)}</div>
        </section>
        <section className="card">
          <h2>Belum lunas <span className="sub" style={{ fontWeight: 500 }}>· {unpaid.length}</span></h2>
          {unpaid.length === 0 ? (
            <div className="empty" style={{ border: 0, padding: 24 }}><Ic n="i-check" size={28} /><b>Semua sudah lunas atau menunggu verifikasi</b></div>
          ) : (
            <div className="rows">
              {unpaid.map((m) => (
                <div className="rw" key={m.id}>
                  <span className="av">{initials(m.name)}</span>
                  <div className="t"><b>{m.name}</b><span style={{ display: 'inline-block', marginTop: 6 }}><StatusChip status={m.status} /></span></div>
                  <a
                    className="ib ol"
                    href={m.countryCode && m.phone ? whatsappLink(m.countryCode, m.phone, reminder(m)) : `https://wa.me/${idWa('0')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Ingatkan ${m.name} lewat WhatsApp`}
                  >
                    <Ic n="i-chat" />
                  </a>
                </div>
              ))}
            </div>
          )}
          <a className="btn ghost" href="/api/admin/export?format=csv"><Ic n="i-download" />Ekspor rekap</a>
        </section>
      </div>
    </>
  );
}
