'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, postJson } from '@/lib/api-client';
import { PASSWORD_MIN } from '@/lib/constants';
import { formatDateOnly } from '@/lib/format';
import type { SettingsView as SV } from '@/lib/types';
import { PageHeader } from './AppShell';
import { DatePicker } from './DatePicker';
import { Ic } from './Ic';
import { ImportModal } from './ImportModal';
import { useToast } from './ToastProvider';
import { PeriodManager } from './PeriodManager';
import { PortfolioConnectionCard } from './PortfolioConnectionCard';
import type { PortfolioStatus } from '@/lib/feedback-types';

export function SettingsView({ initial, portfolio }: { initial: SV; portfolio: PortfolioStatus }) {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [date, setDate] = useState(false);
  const [imp, setImp] = useState(false);
  const [pw, setPw] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const patch = async (body: Record<string, unknown>) => {
    await api('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    router.refresh();
  };

  const saveKas = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!(s.amount >= 1000)) er.amount = 'Nominal minimal Rp1.000.';
    if (!(s.target >= 1)) er.target = 'Target minimal 1.';
    if (s.bankName.trim().length < 2) er.bankName = 'Isi nama bank / QRIS.';
    if (!/^[0-9 -]{5,30}$/.test(s.accountNumber.trim())) er.accountNumber = 'No. rekening hanya angka.';
    if (s.accountName.trim().length < 2) er.accountName = 'Isi nama penerima.';
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await patch({ amount: s.amount, target: s.target, bankName: s.bankName, accountNumber: s.accountNumber, accountName: s.accountName });
      toast('Perubahan disimpan.');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async () => {
    const next = !s.registrationOpen;
    setS((x) => ({ ...x, registrationOpen: next }));
    try {
      await patch({ registrationOpen: next });
      toast(next ? 'Pendaftaran dibuka.' : 'Pendaftaran ditutup.');
    } catch (e) {
      setS((x) => ({ ...x, registrationOpen: !next }));
      toast((e as Error).message, 'error');
    }
  };

  const pickDate = async (v: string) => {
    setDate(false);
    const prev = s.deadline;
    setS((x) => ({ ...x, deadline: v }));
    try {
      await patch({ deadline: v || null });
      toast(v ? 'Tenggat disimpan.' : 'Tenggat dihapus.');
    } catch (e) {
      setS((x) => ({ ...x, deadline: prev }));
      toast((e as Error).message, 'error');
    }
  };

  const changePw = async () => {
    setPwErr('');
    if (pw.length < PASSWORD_MIN) return setPwErr(`Password admin minimal ${PASSWORD_MIN} karakter.`);
    try {
      await postJson('/api/admin/password', { newPassword: pw });
      setPw('');
      toast('Password admin diganti.');
    } catch (e) {
      setPwErr((e as Error).message);
    }
  };

  const num = (k: 'amount' | 'target') => (e: React.ChangeEvent<HTMLInputElement>) => setS((x) => ({ ...x, [k]: Number(e.target.value.replace(/\D/g, '')) || 0 }));
  const txt = (k: 'bankName' | 'accountNumber' | 'accountName') => (e: React.ChangeEvent<HTMLInputElement>) => setS((x) => ({ ...x, [k]: e.target.value }));
  const E = ({ k }: { k: string }) => (errs[k] ? <span className="emsg" role="alert"><Ic n="i-alert" />{errs[k]}</span> : null);

  return (
    <>
      <PageHeader title="Pengaturan" sub="Kas, pendaftaran, data anggota, periode, dan keamanan" mobileSub="Kas, data, periode, keamanan" admin />
      <div className="content">
        <div className="sgrid">
          <div className="setting-left">
          <form className="card" onSubmit={saveKas} noValidate>
            <h2>Kas &amp; rekening tujuan</h2>
            <div className="row2" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
              <div className="f"><label className="lbl" htmlFor="nom">Nominal kas (Rp)</label><input className={`inp num${errs.amount ? ' bad' : ''}`} id="nom" inputMode="numeric" value={s.amount} onChange={num('amount')} /><E k="amount" /></div>
              <div className="f"><label className="lbl" htmlFor="tar">Jumlah anggota (target)</label><input className={`inp num${errs.target ? ' bad' : ''}`} id="tar" inputMode="numeric" value={s.target} onChange={num('target')} /><E k="target" /></div>
            </div>
            <div className="f"><label className="lbl" htmlFor="bank">Bank / QRIS</label><input className={`inp${errs.bankName ? ' bad' : ''}`} id="bank" value={s.bankName} onChange={txt('bankName')} /><E k="bankName" /></div>
            <div className="row2" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
              <div className="f"><label className="lbl" htmlFor="rek">No. rekening</label><input className={`inp num${errs.accountNumber ? ' bad' : ''}`} id="rek" inputMode="numeric" value={s.accountNumber} onChange={txt('accountNumber')} /><E k="accountNumber" /></div>
              <div className="f"><label className="lbl" htmlFor="an">Atas nama</label><input className={`inp${errs.accountName ? ' bad' : ''}`} id="an" value={s.accountName} onChange={txt('accountName')} /><E k="accountName" /></div>
            </div>
            <button type="submit" className="btn pri" disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan perubahan'}</button>
          </form>
          <PeriodManager />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <section className="card"><h2>Pendaftaran</h2>
              <div className="srow">
                <div className="t"><b id="reg-l">Pendaftaran &amp; upload struk dibuka</b><span className="hint">Matikan untuk menutup form Upload bagi anggota baru.</span></div>
                <button type="button" className="swt" role="switch" aria-checked={s.registrationOpen} aria-labelledby="reg-l" onClick={toggle} />
              </div>
              <div className="srow">
                <div className="t"><b>Tenggat pengumpulan</b><span className="hint num">{s.deadline ? formatDateOnly(s.deadline) : 'Belum diatur'}</span></div>
                <button type="button" className="btn ghost sm" onClick={() => setDate(true)}>Ubah</button>
              </div>
            </section>

            <section className="card"><h2>Data anggota</h2>
              <div className="acts">
                <button type="button" className="btn" onClick={() => setImp(true)}><Ic n="i-upload" />Impor anggota</button>
                <a className="btn ghost" href="/api/admin/export?format=csv"><Ic n="i-download" />Ekspor Excel (.csv)</a>
                <a className="btn ghost" href="/api/admin/export?format=json"><Ic n="i-download" />Ekspor JSON</a>
              </div>
              <p className="hint">Ekspor berisi nama, nomor, status, dan alasan penolakan. File CSV bisa dibuka langsung di Excel.</p>
            </section>

            <section className="card"><h2>Keamanan admin</h2>
              <div className="f">
                <label className="lbl" htmlFor="npw">Password admin baru</label>
                <input className={`inp${pwErr ? ' bad' : ''}`} id="npw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={!!pwErr} aria-describedby="npw-h" />
                {pwErr ? <span className="emsg" id="npw-h" role="alert"><Ic n="i-alert" />{pwErr}</span> : <span className="hint" id="npw-h">Minimal {PASSWORD_MIN} karakter.</span>}
              </div>
              <button type="button" className="btn" onClick={changePw}>Ganti password</button>
              <p className="hint">Setelah diganti, sesi admin di perangkat lain berakhir.</p>
            </section>

            <PortfolioConnectionCard initial={portfolio} />

            <section className="card"><h2>Koneksi</h2>
              <div className="srow"><span className="dot" aria-hidden="true" style={online ? undefined : { background: 'var(--rj)' }} /><div className="t"><b>Status koneksi</b><span className="hint">{online ? 'Online. Halaman offline tersedia jika sinyal hilang.' : 'Offline. Perubahan baru bisa disimpan setelah tersambung.'}</span></div></div>
            </section>
          </div>
        </div>
      </div>
      {date && <DatePicker value={s.deadline} onPick={pickDate} onClose={() => setDate(false)} />}
      {imp && <ImportModal onClose={() => setImp(false)} />}
    </>
  );
}
