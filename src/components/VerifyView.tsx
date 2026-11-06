'use client';

import { useMemo, useState } from 'react';
import { formatWhen, initials } from '@/lib/format';
import type { MemberView, PayStatus } from '@/lib/types';
import { PageHeader } from './AppShell';
import { StatusChip } from './HomeView';
import { Ic } from './Ic';
import { ReviewPanel } from './ReviewPanel';

type Tab = 'MENUNGGU' | 'DITOLAK' | 'TERVERIFIKASI';
const TABS: { id: Tab; label: string }[] = [
  { id: 'MENUNGGU', label: 'Menunggu' },
  { id: 'DITOLAK', label: 'Ditolak' },
  { id: 'TERVERIFIKASI', label: 'Setuju' },
];

export function VerifyView({ members, amount }: { members: MemberView[]; amount: number }) {
  const [tab, setTab] = useState<Tab>('MENUNGGU');
  const [sel, setSel] = useState<string | null>(null);

  const withReceipt = useMemo(
    () => members.filter((m) => m.hasReceipt).sort((a, b) => (b.receiptAt ?? '').localeCompare(a.receiptAt ?? '')),
    [members],
  );
  const count = (s: PayStatus) => withReceipt.filter((m) => m.status === s).length;
  const list = withReceipt.filter((m) => m.status === tab);
  const current = list.find((m) => m.id === sel) ?? list[0] ?? null;
  const pending = count('MENUNGGU');

  return (
    <>
      <PageHeader title="Verifikasi struk" sub="Periksa struk, setujui atau tolak dengan alasan" mobileSub={`${pending} struk menunggu`} admin />
      <div className="content">
        <div className="vgrid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <div className="tabs" role="tablist" aria-label="Status struk">
              {TABS.map((t) => (
                <a
                  key={t.id}
                  href="#"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={tab === t.id ? 'on' : undefined}
                  onClick={(e) => { e.preventDefault(); setTab(t.id); setSel(null); }}
                >
                  {t.label} {count(t.id)}
                </a>
              ))}
            </div>
            <section aria-label="Antrean struk" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {list.length === 0 && (
                <div className="empty"><Ic n="i-check" size={28} /><b>{tab === 'MENUNGGU' ? 'Tidak ada struk menunggu' : 'Belum ada'}</b><span className="hint">{tab === 'MENUNGGU' ? 'Semua struk sudah diperiksa.' : 'Daftar ini masih kosong.'}</span></div>
              )}
              {list.map((m) => (
                <button key={m.id} type="button" className={`q ds${current?.id === m.id ? ' on' : ''}`} aria-current={current?.id === m.id} onClick={() => setSel(m.id)}>
                  <span className="av">{initials(m.name)}</span>
                  <div className="t"><b>{m.name}</b><div className="ph num">{m.receiptAt ? formatWhen(m.receiptAt) : ''}</div></div>
                  <StatusChip status={m.status} />
                </button>
              ))}
            </section>
          </div>
          {current ? <ReviewPanel key={current.id} member={current} amount={amount} /> : (
            <div className="empty" style={{ minHeight: 240 }}><Ic n="i-image" size={32} /><b>Pilih struk</b><span className="hint">Pilih satu nama di daftar untuk memeriksa struknya.</span></div>
          )}
        </div>
      </div>
    </>
  );
}
