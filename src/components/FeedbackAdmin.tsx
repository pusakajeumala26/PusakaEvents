'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import { initialsOf } from '@/lib/feedback-input';
import type { FeedbackRowView } from '@/lib/feedback-types';
import { PageHeader } from './AppShell';
import { Ic } from './Ic';
import { useToast } from './ToastProvider';

const time = (iso: string) => new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' });
const STATUS = {
  QUEUED: { cls: 'pe', icon: 'i-clock', label: 'Antrean' },
  SENT: { cls: 'ok', icon: 'i-check', label: 'Terkirim' },
  FAILED: { cls: 'rj', icon: 'i-alert', label: 'Gagal' },
} as const;

export function FeedbackAdmin({ rows }: { rows: FeedbackRowView[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busyId, setBusyId] = useState('');

  const resend = async (row: FeedbackRowView) => {
    if (row.uncertain && !window.confirm('Pengiriman sebelumnya tidak pasti: portfolio mungkin sudah menerimanya. Kirim ulang bisa membuat duplikat. Lanjutkan?')) return;
    setBusyId(row.id);
    try {
      await api(`/api/admin/feedback/${row.id}/resend`, { method: 'POST' });
      toast('Percobaan kirim ulang dijalankan.');
      router.refresh();
    } catch (cause) {
      toast((cause as Error).message, 'error');
    } finally {
      setBusyId('');
    }
  };

  return (
    <>
      <PageHeader title="Feedback" sub="Masukan publik dan status pengirimannya ke portfolio" mobileSub="Status pengiriman" admin />
      <div className="content fb-admin">
        {rows.length === 0 && <div className="card"><p className="hint">Belum ada feedback masuk.</p></div>}
        <ul className="fb-list">
          {rows.map((row) => {
            const st = STATUS[row.syncStatus];
            return (
              <li className="card fb-item" key={row.id}>
                <div className="fb-head">
                  {row.hasAvatar
                    ? <img className="av" src={`/api/admin/feedback/${row.id}/avatar`} alt="" width={48} height={48} loading="lazy" />
                    : <span className="av" aria-hidden="true">{initialsOf(row.name)}</span>}
                  <div className="t">
                    <b>{row.name}</b>
                    <span className="hint">{row.role ?? 'Tanpa peran'} · <span className="num">{time(row.createdAt)}</span></span>
                  </div>
                  <span className={`chip ${st.cls}`}><Ic n={st.icon} />{st.label}</span>
                </div>
                <p className="fb-stars" aria-label={`${row.rating} dari 5 bintang`}>{'★'.repeat(row.rating)}<span aria-hidden="true">{'☆'.repeat(5 - row.rating)}</span></p>
                <p className="fb-msg">{row.message}</p>
                <div className="fb-meta hint">
                  <span>Percobaan: <b className="num">{row.attempts}</b></span>
                  {row.syncStatus === 'SENT' && row.sentAt && <span>Terkirim {time(row.sentAt)}</span>}
                  {row.syncStatus === 'QUEUED' && row.nextAttemptAt && <span>Coba lagi {time(row.nextAttemptAt)}</span>}
                  {row.lastErrorText && <span>Penyebab: {row.lastErrorText}</span>}
                  {row.uncertain && <span>Pengiriman tidak pasti: portfolio mungkin sudah menerimanya.</span>}
                </div>
                {row.syncStatus !== 'SENT' && (
                  <div className="acts">
                    <button type="button" className="btn ghost sm" onClick={() => resend(row)} disabled={busyId === row.id}>
                      {busyId === row.id ? 'Mengirim...' : 'Kirim ulang'}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
