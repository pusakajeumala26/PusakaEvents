'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ADMIN_CONTACTS } from '@/lib/constants';
import { formatDateTime, idWa, initials, rupiah } from '@/lib/format';
import { postJson } from '@/lib/api-client';
import { STATUS_META, type MemberView, type PayInfo, type PayStatus, type SelfView, type Stats } from '@/lib/types';
import { PageHeader } from './AppShell';
import { Ic } from './Ic';
import { OpenDataModal, PayBox, ResubmitModal, UploadModal } from './MemberForms';
import { Select } from './Select';
import { useToast } from './ToastProvider';

const FILTERS = [
  { value: 'ALL', label: 'Semua status' },
  { value: 'TERVERIFIKASI', label: 'Terverifikasi' },
  { value: 'MENUNGGU', label: 'Menunggu' },
  { value: 'DITOLAK', label: 'Ditolak' },
  { value: 'BELUM', label: 'Belum input' },
];

export function StatusChip({ status }: { status: PayStatus }) {
  const m = STATUS_META[status];
  return <span className={m.chip}><Ic n={m.icon} size={14} />{m.label}</span>;
}

export function HomeView({
  members, stats, pay, self, admin, registrationOpen, letingName, autoUpload, dataUnavailable,
}: {
  members: MemberView[];
  stats: Stats;
  pay: PayInfo;
  self: SelfView | null;
  admin: boolean;
  registrationOpen: boolean;
  letingName: string;
  autoUpload: boolean;
  dataUnavailable: boolean;
}) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [modal, setModal] = useState<null | 'upload' | 'open' | 'resubmit'>(autoUpload && registrationOpen && !self ? 'upload' : null);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return members.filter((m) => (filter === 'ALL' || m.status === filter) && (!t || m.name.toLowerCase().includes(t)));
  }, [members, q, filter]);

  const c = stats.counts;
  const seg = [
    { cls: 's-ok', n: c.TERVERIFIKASI },
    { cls: 's-pe', n: c.MENUNGGU },
    { cls: 's-rj', n: c.DITOLAK },
    { cls: 's-no', n: c.BELUM },
  ];
  const peak = Math.max(1, ...stats.days.map((d) => d.n));

  return (
    <>
      <PageHeader
        title="Beranda"
        sub={`Rekap kas leting ${letingName}, ${rupiah(pay.amount)} per anggota`}
        mobileSub={`Kas leting ${rupiah(pay.amount)}`}
        admin={admin}
      />
      <div className="content">
        {dataUnavailable && <div className="empty" role="alert"><b>Database belum siap.</b><p>Data kas belum dapat dimuat. Pengaturan sementara ditampilkan. Pastikan migrasi database berhasil lalu muat ulang halaman.</p></div>}
        {self && <SelfCard self={self} onResubmit={() => setModal('resubmit')} />}

        <section className="stats" aria-label="Ringkasan">
          <div className="stat">
            <div className="k">Sudah upload struk</div>
            <div className="v num">{stats.uploaded} <small>dari {stats.target} anggota</small></div>
            <div className="bar" role="img" aria-label={`${stats.uploadedPct} persen anggota sudah upload`}><i style={{ width: `${stats.uploadedPct}%` }} /></div>
            <div className="seg" role="img" aria-label={`${c.TERVERIFIKASI} terverifikasi, ${c.MENUNGGU} menunggu, ${c.DITOLAK} ditolak, ${c.BELUM} belum input`}>
              {seg.filter((s) => s.n > 0).map((s) => <i key={s.cls} className={s.cls} style={{ flex: s.n }} />)}
            </div>
            <div className="lg">
              <span><i className="s-ok" />{c.TERVERIFIKASI} Terverifikasi</span>
              <span><i className="s-pe" />{c.MENUNGGU} Menunggu</span>
              <span><i className="s-rj" />{c.DITOLAK} Ditolak</span>
              <span><i className="s-no" />{c.BELUM} Belum</span>
            </div>
          </div>
          <div className="stat">
            <div className="k">Upload harian · 7 hari terakhir</div>
            <div className="v num">{stats.peakN} <small>{stats.peakN ? `puncak, ${stats.peakLabel}` : 'belum ada upload'}</small></div>
            <div className="chart" role="img" aria-label={`Upload per hari: ${stats.days.map((d) => d.n).join(', ')}`}>
              {stats.days.map((d, i) => (
                <i key={i} className={d.n === peak && d.n > 0 ? 'hi' : undefined} style={{ height: `${Math.max(6, (d.n / peak) * 100)}%` }} />
              ))}
            </div>
            <div className="days" aria-hidden="true">{stats.days.map((d, i) => <span key={i}>{d.label}</span>)}</div>
          </div>
        </section>

        <section className="card" aria-label="Rekening tujuan"><h2>Rekening tujuan kas</h2><PayBox pay={pay} /></section>

        <div className="tools">
          <div className="search">
            <Ic n="i-search" />
            <label className="lbl sr" htmlFor="q">Cari anggota</label>
            <input className="inp" id="q" type="search" placeholder="Cari nama anggota" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select ariaLabel="Filter status" value={filter} options={FILTERS} onChange={setFilter} align="right" menuWidth={210} className="tools-sel" />
          {!self && (
            <button type="button" className="btn pri" disabled={!registrationOpen} onClick={() => setModal('upload')}>
              <Ic n="i-upload" />Upload
            </button>
          )}
          {!self && (
            <button type="button" className="btn ghost" onClick={() => setModal('open')}><Ic n="i-user" />Buka data saya</button>
          )}
        </div>
        {!registrationOpen && !self && <div className="note neu" role="status"><Ic n="i-alert" /><div>Pendaftaran sedang ditutup oleh admin.</div></div>}

        {shown.length === 0 ? (
          <section className="empty" aria-live="polite">
            <Ic n="i-search" size={32} />
            <h2>{members.length === 0 ? 'Belum ada anggota' : 'Anggota tidak ditemukan'}</h2>
            <p className="sub">
              {members.length === 0
                ? 'Belum ada yang mendaftar. Jadilah yang pertama upload struk.'
                : q ? `Tidak ada nama yang cocok dengan "${q}". Periksa ejaan atau ganti filter status.` : 'Tidak ada anggota dengan status ini.'}
            </p>
            {(q || filter !== 'ALL') && <button type="button" className="btn ghost" onClick={() => { setQ(''); setFilter('ALL'); }}>Hapus pencarian</button>}
          </section>
        ) : (
          <section className="list" aria-label="Daftar anggota">
            {shown.map((m) => <MemberCard key={m.id} m={m} admin={admin} />)}
          </section>
        )}

        <section className="card" aria-label="Kontak pengurus">
          <h2>Hubungi pengurus</h2>
          <div className="cgrid">
            {ADMIN_CONTACTS.map((p) => (
              <div className="ct" key={p.phone}>
                <span className="av">{initials(p.name)}</span>
                <div className="t"><b>{p.name}</b><span>{p.title} · <span className="num">{p.phone}</span></span></div>
                <a className="ib ol" href={`https://wa.me/${idWa(p.phone)}`} target="_blank" rel="noopener noreferrer" aria-label={`Chat WhatsApp ${p.name}, ${p.title}`}>
                  <Ic n="i-chat" />
                </a>
              </div>
            ))}
          </div>
        </section>
      </div>

      {modal === 'upload' && <UploadModal pay={pay} onClose={() => setModal(null)} />}
      {modal === 'open' && <OpenDataModal onClose={() => setModal(null)} />}
      {modal === 'resubmit' && self && <ResubmitModal pay={pay} rejected={self.status === 'DITOLAK'} onClose={() => setModal(null)} />}
    </>
  );
}

function MemberCard({ m, admin }: { m: MemberView; admin: boolean }) {
  const body = (
    <>
      <span className="av">{initials(m.name)}</span>
      <div className="t">
        <b>{m.name}</b>
        <div className="m"><StatusChip status={m.status} /><span className="ph num">{m.phoneDisplay}</span></div>
      </div>
      {admin && <Ic n="i-chev" />}
    </>
  );
  return admin ? <Link className="mc" href={`/anggota/${m.id}`}>{body}</Link> : <div className="mc">{body}</div>;
}

/** Kartu status anggota yang sedang masuk ("Buka data saya"). */
function SelfCard({ self, onResubmit }: { self: SelfView; onResubmit: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const logout = async () => {
    try {
      await postJson('/api/me/logout', {});
      router.refresh();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  return (
    <section className="card" aria-label="Statusmu">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span className="av lg2">{initials(self.name)}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 style={{ fontSize: 20, overflowWrap: 'anywhere' }}>{self.name}</h2>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusChip status={self.status} />
            <span className="hint num">{self.phoneDisplay}{self.receiptAt ? ` · struk ${formatDateTime(self.receiptAt)}` : ''}</span>
          </div>
        </div>
      </div>
      {self.status === 'DITOLAK' && (
        <div className="note" role="note"><Ic n="i-alert" /><div><b>Alasan penolakan</b><br />{self.rejectReason || 'Struk belum sesuai.'}</div></div>
      )}
      {self.status === 'MENUNGGU' && <div className="note pe" role="note"><Ic n="i-clock" /><div>Strukmu sedang menunggu pemeriksaan admin.</div></div>}
      {self.status === 'TERVERIFIKASI' && <div className="note neu" role="note"><Ic n="i-check" /><div>Struk kamu sudah terverifikasi. Terima kasih!</div></div>}
      <div className="acts">
        {self.status !== 'TERVERIFIKASI' && (
          <button type="button" className="btn pri" onClick={onResubmit}>
            <Ic n="i-upload" />{self.status === 'DITOLAK' ? 'Kirim ulang struk' : self.status === 'BELUM' ? 'Upload struk' : 'Ganti struk'}
          </button>
        )}
        {self.status !== 'BELUM' && (
          <a className="btn ghost" href={`/api/members/${self.id}/receipt`} target="_blank" rel="noopener noreferrer"><Ic n="i-image" />Lihat struk</a>
        )}
        <button type="button" className="btn ghost" onClick={logout}><Ic n="i-lock" />Keluar</button>
      </div>
    </section>
  );
}
