'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, postJson } from '@/lib/api-client';
import { formatDateOnly, rupiah } from '@/lib/format';
import { safeReceiptFilename } from '@/lib/storage-cleanup';
import { createZip } from '@/lib/zip-store';
import { useToast } from './ToastProvider';
import { PASSWORD_MIN } from '@/lib/constants';
import { Dialog } from './MemberForms';
import { Ic } from './Ic';

type Counts = { total: number; TERVERIFIKASI: number; MENUNGGU: number; DITOLAK: number; BELUM: number };
type PeriodRecord = {
  id: string; name: string; amount: number; targetCount: number; startedAt: string; closedAt: string;
  totalMembers: number; verifiedCount: number; pendingCount: number; rejectedCount: number; unpaidCount: number;
  verifiedTotal: number; receiptCount: number; cleanupStatus: 'OK' | 'PARTIAL';
};
type PeriodResponse = {
  current: { name: string; startedAt: string; amount: number; targetCount: number; counts: Counts; verifiedTotal: number; databaseReceiptCount: number; receiptCount: number; receiptSize: number; storageAvailable: boolean; storageConsistent: boolean };
  history: PeriodRecord[];
};
type ArchiveResponse = {
  setting: { periodName: string; periodStartedAt: string; amount: number; target: number; deadline: string | null };
  receiptCount: number; storageReceiptCount: number; receiptSize: number;
  members: Array<Record<string, unknown> & { id: string; name: string; hasReceipt: boolean }>;
};
type NewPeriod = { name: string; amount: number; targetCount: number; deadline: string | null };

const fmtDate = (value: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(new Date(value));
const formatSize = (value: number) => value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KB` : `${(value / (1024 * 1024)).toFixed(2)} MB`;

export function PeriodManager() {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<PeriodResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [retrying, setRetrying] = useState('');
  const [modal, setModal] = useState(false);
  const [step, setStep] = useState(1);
  const [newPeriod, setNewPeriod] = useState<NewPeriod | null>(null);
  const [archive, setArchive] = useState<{ receiptCount: number; memberCount: number; sha256: string } | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [archiveError, setArchiveError] = useState('');
  const [closeError, setCloseError] = useState('');
  const [checked, setChecked] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [password, setPassword] = useState('');

  const refresh = async () => setData(await api<PeriodResponse>('/api/admin/period'));
  useEffect(() => { void refresh().catch((error) => toast((error as Error).message, 'error')); }, []);

  const startClose = async () => {
    setBusy(true);
    try { await refresh(); }
    catch (error) { toast((error as Error).message, 'error'); setBusy(false); return; }
    setStep(1); setNewPeriod(null); setArchive(null); setArchiveError(''); setCloseError('');
    setChecked(false); setConfirmName(''); setPassword(''); setModal(true); setBusy(false);
  };

  const prepareNewPeriod = () => {
    if (!data) return;
    setNewPeriod({
      name: `Periode ${data.history.length + 2}`,
      amount: data.current.amount,
      targetCount: Math.max(1, data.current.counts.total),
      deadline: null,
    });
    setStep(2);
  };

  const buildArchive = async () => {
    setBusy(true); setArchive(null); setArchiveError(''); setProgress({ done: 0, total: 0 });
    try {
      const [snapshot, csvResponse] = await Promise.all([
        api<ArchiveResponse>('/api/admin/period/archive'),
        fetch('/api/admin/export?format=csv', { cache: 'no-store' }),
      ]);
      if (!csvResponse.ok) throw new Error('Rekap anggota tidak dapat diunduh. Periksa sesi admin dan coba lagi.');
      if (snapshot.receiptCount !== snapshot.storageReceiptCount) {
        throw new Error('Jumlah berkas struk di database dan storage berbeda. Arsip dibatalkan; minta bantuan admin teknis sebelum menutup periode.');
      }
      const receipts = snapshot.members.filter((member) => member.hasReceipt);
      if (receipts.length !== snapshot.storageReceiptCount) throw new Error('Daftar struk berubah. Muat ulang pratinjau dan coba lagi.');
      const counts = { total: snapshot.members.length, TERVERIFIKASI: 0, MENUNGGU: 0, DITOLAK: 0, BELUM: 0 };
      for (const member of snapshot.members) {
        const status = member.status;
        if (status === 'TERVERIFIKASI' || status === 'MENUNGGU' || status === 'DITOLAK' || status === 'BELUM') counts[status] += 1;
      }
      setProgress({ done: 0, total: receipts.length });
      const files: { name: string; data: string | Uint8Array }[] = [
        { name: 'rekap.csv', data: await csvResponse.text() },
        { name: 'anggota.json', data: JSON.stringify(snapshot.members, null, 2) },
        { name: 'ringkasan.json', data: JSON.stringify({
          periode: snapshot.setting,
          dibuatPada: new Date().toISOString(),
          jumlahAnggota: snapshot.members.length,
          ringkasanStatus: counts,
          totalKasTerverifikasi: counts.TERVERIFIKASI * snapshot.setting.amount,
          jumlahStruk: snapshot.storageReceiptCount,
          ukuranStrukBytes: snapshot.receiptSize,
        }, null, 2) },
        { name: 'struk/', data: new Uint8Array() },
      ];
      const seen = new Set<string>();
      let cursor = 0;
      let failure: Error | null = null;
      const workers = Array.from({ length: Math.min(4, receipts.length) }, async () => {
        while (failure === null) {
          const index = cursor++;
          if (index >= receipts.length) return;
          const member = receipts[index];
          try {
            const response = await fetch(`/api/members/${encodeURIComponent(member.id)}/receipt?download=1`, { cache: 'no-store' });
            if (!response.ok) throw new Error(`Struk ${member.name} gagal diunduh (HTTP ${response.status}).`);
            const data = new Uint8Array(await response.arrayBuffer());
            files.push({ name: `struk/${safeReceiptFilename(member.name, member.id, seen)}`, data });
            setProgress((current) => ({ ...current, done: current.done + 1 }));
          } catch (error) { failure = error as Error; }
        }
      });
      await Promise.all(workers);
      if (failure) throw failure;
      const zip = await createZip(files);
      const digest = await crypto.subtle.digest('SHA-256', await zip.arrayBuffer());
      const sha256 = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
      const url = URL.createObjectURL(zip);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeArchiveName(snapshot.setting.periodName)}.zip`;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setArchive({ receiptCount: receipts.length, memberCount: snapshot.members.length, sha256 });
    } catch (error) {
      setArchiveError((error as Error).message || 'Arsip gagal dibuat.');
    } finally { setBusy(false); }
  };

  const close = async () => {
    if (!data || !newPeriod || !archive) return;
    setBusy(true); setCloseError('');
    try {
      const result = await postJson<{ cleanupStatus: 'OK' | 'PARTIAL' }>('/api/admin/period/close', {
        confirmName: data.current.name,
        confirmStartedAt: data.current.startedAt,
        password,
        archivedReceiptCount: archive.receiptCount,
        archivedMemberCount: archive.memberCount,
        newPeriod,
      });
      toast(result.cleanupStatus === 'PARTIAL' ? 'Periode ditutup. Sebagian struk belum terhapus; ulangi pembersihan dari riwayat.' : 'Periode ditutup dan data anggota direset.');
      setModal(false); setBusy(false); await refresh(); router.refresh();
    } catch (error) {
      setCloseError((error as Error).message);
      setBusy(false);
    }
  };

  const retryCleanup = async (id: string) => {
    setRetrying(id);
    try {
      const result = await postJson<{ cleanupStatus: 'OK' | 'PARTIAL' }>(`/api/admin/period/${id}/cleanup`, {});
      toast(result.cleanupStatus === 'OK' ? 'Pembersihan struk selesai.' : 'Masih ada struk yang belum terhapus.', result.cleanupStatus === 'OK' ? 'ok' : 'error');
      await refresh();
    } catch (error) { toast((error as Error).message, 'error'); }
    finally { setRetrying(''); }
  };

  if (!data) return <section className="card period-card"><h2>Tutup periode event</h2><p className="hint">Memuat data periode…</p></section>;
  const current = data.current;
  const countRows = [
    ['Terverifikasi', current.counts.TERVERIFIKASI], ['Menunggu', current.counts.MENUNGGU],
    ['Ditolak', current.counts.DITOLAK], ['Belum input', current.counts.BELUM],
  ] as const;

  return (
    <section className="card period-card" aria-labelledby="period-heading">
      <h2 id="period-heading">Tutup periode event</h2>
      <div className="period-current">
        <div><span className="pay-label">Periode aktif</span><strong>{current.name}</strong></div>
        <div><span className="pay-label">Dimulai</span><strong>{fmtDate(current.startedAt)}</strong></div>
        <div><span className="pay-label">Status</span><strong>{current.counts.TERVERIFIKASI} terverifikasi / {current.counts.total} anggota</strong></div>
        <div><span className="pay-label">Kas terverifikasi</span><strong>{rupiah(current.verifiedTotal)}</strong></div>
      </div>
      {!current.storageAvailable && <p className="note pe" role="alert"><Ic n="i-alert" />Storage tidak dapat diperiksa saat ini. Riwayat tetap tersedia, tetapi arsip dan penutupan periode dinonaktifkan sementara.</p>}
      {current.storageAvailable && !current.storageConsistent && <p className="note pe" role="alert"><Ic n="i-alert" />Jumlah struk pada database ({current.databaseReceiptCount}) berbeda dari berkas storage ({current.receiptCount}). Arsip tidak dapat ditutup dengan aman.</p>}
      <button type="button" className="btn danger" disabled={busy} onClick={() => void startClose()}><Ic n="i-alert" />Tutup periode event</button>

      <div className="period-history">
        <h3>Riwayat periode</h3>
        {data.history.length === 0 ? <p className="hint">Belum ada periode yang ditutup.</p> : data.history.map((period) => (
          <article className="period-row" key={period.id}>
            <div className="period-row-main">
              <strong>{period.name}</strong><span className="hint">Ditutup {fmtDate(period.closedAt)}</span>
              <span>{period.verifiedCount}/{period.totalMembers} terverifikasi · {rupiah(period.verifiedTotal)} · {period.receiptCount} struk</span>
              <span className={period.cleanupStatus === 'OK' ? 'chip ok' : 'chip rj'}><Ic n={period.cleanupStatus === 'OK' ? 'i-check' : 'i-alert'} size={14} />{period.cleanupStatus === 'OK' ? 'Storage bersih' : 'Pembersihan tertunda'}</span>
            </div>
            <div className="period-row-actions">
              <a className="btn ghost sm" href={`/api/admin/period/${period.id}/csv`}><Ic n="i-download" />Unduh CSV</a>
              {period.cleanupStatus === 'PARTIAL' && <button type="button" className="btn sm" disabled={retrying === period.id} onClick={() => void retryCleanup(period.id)}><Ic n="i-refresh" />{retrying === period.id ? 'Mengulang…' : 'Ulangi pembersihan'}</button>}
            </div>
          </article>
        ))}
      </div>

      {modal && <Dialog title="Tutup periode event" titleId="period-close-title" wide onClose={() => !busy && setModal(false)} footer={<PeriodFooter step={step} setStep={setStep} busy={busy} canContinue={step === 1 ? current.storageConsistent : step === 2 ? !!newPeriod?.name.trim() && newPeriod.amount >= 1000 && newPeriod.targetCount >= 1 : step === 3 ? !!archive : !!archive && checked && confirmName === current.name && password.length >= PASSWORD_MIN} onNext={() => setStep(step + 1)} onClose={close} /> }>
        <div className="stepper" aria-label={`Langkah ${step} dari 4`}><span className={step >= 1 ? 'on' : ''}>1 Pratinjau</span><span className={step >= 2 ? 'on' : ''}>2 Periode baru</span><span className={step >= 3 ? 'on' : ''}>3 Arsip</span><span className={step >= 4 ? 'on' : ''}>4 Konfirmasi</span></div>
        {step === 1 && <div className="period-step">
          <h3>Pratinjau {current.name}</h3>
          <div className="period-metrics">{countRows.map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}<div><span>Total kas terverifikasi</span><strong>{rupiah(current.verifiedTotal)}</strong></div><div><span>File struk · ukuran bucket</span><strong>{current.receiptCount} · {formatSize(current.receiptSize)}</strong></div></div>
          <div className="note neu"><Ic n="i-alert" /><div><b>Akan dihapus</b><p>Semua struk pada prefix struk/, data struk anggota, alasan penolakan, waktu tinjauan, dan seluruh riwayat MemberEvent.</p><b>Data yang tetap</b><p>Nama, nomor HP, subjek, gender, dan passwordHash akun anggota.</p></div></div>
        </div>}
        {step === 2 && newPeriod && <div className="period-step">
          <h3>Atur periode baru</h3><p className="hint">Pendaftaran akan tetap tertutup sampai dibuka kembali oleh admin.</p>
          <div className="f"><label className="lbl" htmlFor="period-new-name">Nama periode baru</label><input className="inp" id="period-new-name" maxLength={80} value={newPeriod.name} onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })} /></div>
          <div className="row2"><div className="f"><label className="lbl" htmlFor="period-new-amount">Nominal kas (Rp)</label><input className="inp num" id="period-new-amount" type="number" min={1000} max={10000000} value={newPeriod.amount} onChange={(e) => setNewPeriod({ ...newPeriod, amount: Number(e.target.value) })} /></div><div className="f"><label className="lbl" htmlFor="period-new-target">Target anggota</label><input className="inp num" id="period-new-target" type="number" min={1} max={5000} value={newPeriod.targetCount} onChange={(e) => setNewPeriod({ ...newPeriod, targetCount: Number(e.target.value) })} /></div></div>
          <div className="f"><label className="lbl" htmlFor="period-new-deadline">Tenggat opsional</label><input className="inp" id="period-new-deadline" type="date" value={newPeriod.deadline ?? ''} onChange={(e) => setNewPeriod({ ...newPeriod, deadline: e.target.value || null })} /></div>
        </div>}
        {step === 3 && <div className="period-step">
          <h3>Unduh arsip penuh</h3><p className="hint">ZIP dibuat di browser perangkat ini. Jangan tutup jendela sampai unduhan selesai.</p>
          {progress.total > 0 && <div className="archive-progress"><progress max={progress.total} value={progress.done} aria-label="Progress unduh struk" /><span>{progress.done} dari {progress.total} struk</span></div>}
          {archiveError && <div className="note" role="alert"><Ic n="i-alert" /><span>{archiveError}</span></div>}
          {archive && <div className="note neu"><Ic n="i-check" /><div><b>Arsip ZIP selesai diunduh</b><p>{archive.receiptCount} file struk · SHA-256</p><code className="sha">{archive.sha256}</code></div></div>}
          <button type="button" className="btn pri" disabled={busy || !current.storageConsistent} onClick={() => void buildArchive()}><Ic n="i-download" />{busy ? 'Membuat arsip…' : archiveError ? 'Coba lagi' : archive ? 'Buat ulang arsip' : 'Buat dan unduh arsip ZIP'}</button>
        </div>}
        {step === 4 && <div className="period-step">
          <h3>Konfirmasi penutupan</h3><p>Arsip: <b>{archive?.receiptCount} file struk</b> · SHA-256 <code className="sha-short">{archive?.sha256.slice(0, 20)}…</code></p>
          <label className="checkline"><input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} /><span>Saya sudah memeriksa bahwa file arsip tersimpan.</span></label>
          <div className="f"><label className="lbl" htmlFor="period-confirm-name">Ketik nama periode aktif persis: <b>{current.name}</b></label><input className="inp" id="period-confirm-name" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} autoComplete="off" /></div>
          <div className="f"><label className="lbl" htmlFor="period-confirm-password">Masukkan password admin lagi</label><input className="inp" id="period-confirm-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></div>
          {closeError && <div className="note" role="alert"><Ic n="i-alert" /><span>{closeError}</span>{(closeError.includes('Jumlah struk berubah') || closeError.includes('Jumlah struk tidak cocok') || closeError.includes('Jumlah anggota berubah') || closeError.includes('storage berbeda')) && <button type="button" className="btn sm" onClick={() => { setStep(3); setArchive(null); }}>Unduh ulang arsip</button>}</div>}
        </div>}
      </Dialog>}
    </section>
  );
}

function safeArchiveName(name: string) {
  return `${name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'periode'}.zip`;
}

function PeriodFooter({ step, setStep, busy, canContinue, onNext, onClose }: {
  step: number; setStep: (step: number) => void; busy: boolean; canContinue: boolean; onNext: () => void; onClose: () => void;
}) {
  return <>
    {step > 1 && <button type="button" className="btn ghost" disabled={busy} onClick={() => setStep(step - 1)}>Kembali</button>}
    {step < 3 && <button type="button" className="btn pri" onClick={onNext}>{step === 1 ? 'Lanjut ke periode baru' : 'Lanjut ke arsip'}<Ic n="i-chev" /></button>}
    {step === 3 && <button type="button" className="btn pri" disabled={busy || !canContinue} onClick={onNext}>Lanjut ke konfirmasi<Ic n="i-chev" /></button>}
    {step === 4 && <button type="button" className="btn danger" disabled={busy || !canContinue} onClick={onClose}><Ic n="i-alert" />{busy ? 'Menutup periode…' : 'Tutup periode sekarang'}</button>}
  </>;
}
