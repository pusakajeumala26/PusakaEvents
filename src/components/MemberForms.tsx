'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, copyText, postJson } from '@/lib/api-client';
import { COUNTRY_OPTIONS, PASSWORD_MIN, SUBJECT_MAX } from '@/lib/constants';
import { rupiah, titleCase } from '@/lib/format';
import type { PayInfo } from '@/lib/types';
import { useDialog } from '@/lib/use-dialog';
import { Ic } from './Ic';
import { ReceiptField } from './ReceiptField';
import { Select } from './Select';
import { useToast } from './ToastProvider';

const COUNTRY_OPTS = COUNTRY_OPTIONS.map((c) => ({ value: c.code, label: c.label }));
const GENDER_OPTS = [{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }];

type Dlg = { title: string; titleId: string; onClose: () => void; wide?: boolean; children: React.ReactNode; footer: React.ReactNode };

/** Kerangka dialog: modal di desktop, bottom sheet di mobile (lewat CSS). */
export function Dialog({ title, titleId, onClose, wide, children, footer }: Dlg) {
  const ref = useDialog<HTMLDivElement>(onClose);
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`dlg${wide ? ' wd' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
        <header>
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="ib ol" aria-label="Tutup" onClick={onClose}><Ic n="i-x" /></button>
        </header>
        <div className="bd">{children}</div>
        <footer>{footer}</footer>
      </div>
    </div>
  );
}

export function PayBox({ pay }: { pay: PayInfo }) {
  const toast = useToast();
  return (
    <div className="pay">
      <b>Transfer {rupiah(pay.amount)} ke</b>
      <span className="mono">{pay.bankName}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
        <span className="mono num" style={{ fontSize: 18 }}>{pay.accountNumber}</span>
        <button
          type="button"
          className="btn sm"
          aria-label={`Salin nomor rekening ${pay.accountNumber}`}
          onClick={async () => toast((await copyText(pay.accountNumber)) ? 'Nomor rekening disalin.' : 'Gagal menyalin. Salin manual.', 'ok')}
        >
          <Ic n="i-copy" />Salin
        </button>
      </span>
      <span>a.n. <span className="mono">{pay.accountName}</span></span>
    </div>
  );
}

const Err = ({ id, msg }: { id: string; msg?: string }) =>
  msg ? <span className="emsg" id={id} role="alert"><Ic n="i-alert" />{msg}</span> : null;

function PasswordInput({ id, value, onChange, error, autoComplete, describedBy }: {
  id: string; value: string; onChange: (v: string) => void; error?: string; autoComplete: string; describedBy?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw">
      <input
        className={`inp${error ? ' bad' : ''}`}
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" className="ib" aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'} onClick={() => setShow((s) => !s)}>
        <Ic n="i-eye" />
      </button>
    </div>
  );
}

/* ---------------------------- Daftar + upload struk ---------------------------- */

export function UploadModal({ pay, onClose }: { pay: PayInfo; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState({ name: '', countryCode: '+62', phone: '', gender: '', subject: '', password: '' });
  const [file, setFile] = useState<File | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [serverErr, setServerErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof v) => (val: string) => setV((s) => ({ ...s, [k]: val }));
  const setErr = (k: string, m: string) => setErrs((s) => ({ ...s, [k]: m }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (v.name.trim().length < 3) e.name = v.name.trim() ? 'Tulis nama lengkap, minimal 3 huruf.' : 'Nama wajib diisi.';
    const digits = v.phone.replace(/\D/g, '').replace(/^0+/, '');
    if (digits.length < 8) e.phone = 'Nomor HP terlalu pendek.';
    if (!v.gender) e.gender = 'Pilih gender.';
    if (v.password.length < PASSWORD_MIN) e.password = `Password minimal ${PASSWORD_MIN} karakter.`;
    if (!file && !errs.receipt) e.receipt = 'Struk transfer wajib diunggah.';
    else if (!file) e.receipt = errs.receipt;
    return e;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrs(e);
    setServerErr('');
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set('name', v.name);
      fd.set('countryCode', v.countryCode);
      fd.set('phone', v.phone);
      fd.set('gender', v.gender);
      fd.set('subject', v.subject);
      fd.set('password', v.password);
      fd.set('receipt', file!);
      await api('/api/members', { method: 'POST', body: fd });
      setDone(true);
      router.refresh();
    } catch (err) {
      setServerErr((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Dialog title="Berhasil" titleId="up-t" onClose={onClose} footer={<button type="button" className="btn pri" onClick={() => { toast('Struk terkirim.'); onClose(); }}>Kembali ke beranda</button>}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14, padding: '12px 0' }}>
          <span className="av lg2" style={{ background: 'var(--ink)', color: '#fff' }}><Ic n="i-check" size={32} /></span>
          <h3 style={{ fontSize: 20, fontWeight: 650 }}>Struk terkirim</h3>
          <p className="sub">Terima kasih. Admin akan memeriksa strukmu. Cek statusnya kapan saja di bagian atas Beranda.</p>
          <span className="chip pe"><Ic n="i-clock" size={14} />Menunggu verifikasi</span>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      title="Upload data & struk kas"
      titleId="up-t"
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>Batal</button>
          <button type="submit" form="up-form" className="btn pri" disabled={busy}><Ic n="i-upload" />{busy ? 'Mengirim...' : 'Kirim data & struk'}</button>
        </>
      }
    >
      <form id="up-form" onSubmit={submit} noValidate style={{ display: 'contents' }}>
        <p className="sub">Isi data dan lampirkan struk transfer {rupiah(pay.amount)}. Statusmu akan menjadi <b>Menunggu verifikasi</b> sampai admin memeriksa.</p>
        {serverErr && <div className="note" role="alert"><Ic n="i-alert" /><div>{serverErr}</div></div>}
        <div className="up-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="f">
              <label className="lbl" htmlFor="up-nama">Nama lengkap</label>
              <input className={`inp${errs.name ? ' bad' : ''}`} id="up-nama" value={v.name} autoComplete="name" aria-invalid={!!errs.name} aria-describedby="up-nama-e"
                onChange={(e) => set('name')(e.target.value)} onBlur={() => v.name.trim() && set('name')(titleCase(v.name))} data-autofocus />
              <Err id="up-nama-e" msg={errs.name} />
            </div>
            <div className="f">
              <label className="lbl" htmlFor="up-hp">No. HP / WhatsApp</label>
              <div className="row2">
                <Select ariaLabel="Kode negara" value={v.countryCode} options={COUNTRY_OPTS} onChange={set('countryCode')} searchable searchPlaceholder="Cari negara" mono menuWidth={200} />
                <input className={`inp num${errs.phone ? ' bad' : ''}`} id="up-hp" type="tel" inputMode="tel" value={v.phone} autoComplete="tel-national" placeholder="812 3456 7890"
                  aria-invalid={!!errs.phone} aria-describedby="up-hp-e" onChange={(e) => set('phone')(e.target.value)} />
              </div>
              {errs.phone ? <Err id="up-hp-e" msg={errs.phone} /> : <span className="hint" id="up-hp-e">Dipakai admin untuk notifikasi lewat WhatsApp.</span>}
            </div>
            <div className="f">
              <label className="lbl" htmlFor="up-gen">Gender</label>
              <Select id="up-gen" value={v.gender} options={GENDER_OPTS} onChange={set('gender')} placeholder="Pilih gender" invalid={!!errs.gender} />
              <Err id="up-gen-e" msg={errs.gender} />
            </div>
            <div className="f">
              <label className="lbl" htmlFor="up-pw">Password</label>
              <PasswordInput id="up-pw" value={v.password} onChange={set('password')} error={errs.password} autoComplete="new-password" describedBy="up-pw-e" />
              {errs.password ? <Err id="up-pw-e" msg={errs.password} /> : <span className="hint" id="up-pw-e">Untuk membuka datamu lagi dan mengirim ulang struk jika ditolak. Minimal {PASSWORD_MIN} karakter.</span>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="f">
              <label className="lbl" htmlFor="up-sub">Subjek <i>(deskripsi singkat, opsional)</i></label>
              <textarea className="inp" id="up-sub" maxLength={SUBJECT_MAX} value={v.subject} onChange={(e) => set('subject')(e.target.value)} />
              <span className="hint num" style={{ textAlign: 'right' }}>{v.subject.length} / {SUBJECT_MAX}</span>
            </div>
            <PayBox pay={pay} />
            <ReceiptField file={file} onFile={(f) => { setFile(f); if (f) setErr('receipt', ''); }} error={errs.receipt} onError={(m) => setErr('receipt', m)} />
          </div>
        </div>
      </form>
    </Dialog>
  );
}

/* ---------------------------- Buka data saya ---------------------------- */

export function OpenDataModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [cc, setCc] = useState('+62');
  const [phone, setPhone] = useState('');
  const [pw, setPw] = useState('');
  const [needsPw, setNeedsPw] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (phone.replace(/\D/g, '').length < 8) return setErr('Nomor HP terlalu pendek.');
    if (!pw) return setErr(needsPw ? 'Buat password baru.' : 'Isi password.');
    setBusy(true);
    try {
      const r = await postJson<{ needsPassword?: boolean; ok?: boolean }>('/api/me/login', needsPw ? { countryCode: cc, phone, newPassword: pw } : { countryCode: cc, phone, password: pw });
      if (r.needsPassword) {
        setNeedsPw(true);
        setPw('');
        return;
      }
      toast('Data dibuka.');
      router.refresh();
      onClose();
    } catch (er) {
      setErr((er as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      title="Buka data saya"
      titleId="od-t"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>Batal</button>
          <button type="submit" form="od-form" className="btn pri" disabled={busy}><Ic n="i-lock" />{busy ? 'Memeriksa...' : needsPw ? 'Simpan & buka' : 'Buka data'}</button>
        </>
      }
    >
      <form id="od-form" onSubmit={submit} noValidate style={{ display: 'contents' }}>
        <p className="sub">Masuk dengan nomor HP dan password yang kamu buat saat mendaftar untuk melihat status dan mengirim ulang struk.</p>
        {needsPw && <div className="note neu" role="status"><Ic n="i-alert" /><div>Datamu didaftarkan oleh admin dan belum punya password. Buat password baru (minimal {PASSWORD_MIN} karakter) untuk melanjutkan.</div></div>}
        <div className="f">
          <label className="lbl" htmlFor="od-hp">No. HP / WhatsApp</label>
          <div className="row2">
            <Select ariaLabel="Kode negara" value={cc} options={COUNTRY_OPTS} onChange={setCc} searchable searchPlaceholder="Cari negara" mono menuWidth={200} />
            <input className={`inp num${err && !needsPw ? ' bad' : ''}`} id="od-hp" type="tel" inputMode="tel" value={phone} autoComplete="tel-national" placeholder="812 3456 7890" onChange={(e) => setPhone(e.target.value)} data-autofocus />
          </div>
        </div>
        <div className="f">
          <label className="lbl" htmlFor="od-pw">{needsPw ? 'Password baru' : 'Password'}</label>
          <PasswordInput id="od-pw" value={pw} onChange={setPw} error={err} autoComplete={needsPw ? 'new-password' : 'current-password'} describedBy="od-e" />
          <Err id="od-e" msg={err} />
          {!needsPw && (
            <span className="hint">Lupa password? <a href="https://wa.me/6281262040241" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>Hubungi bendahara lewat WhatsApp</a>.</span>
          )}
        </div>
      </form>
    </Dialog>
  );
}

/* ---------------------------- Kirim ulang / upload struk (sudah masuk) ---------------------------- */

export function ResubmitModal({ pay, rejected, onClose }: { pay: PayInfo; rejected: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setErr(err || 'Struk transfer wajib diunggah.');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set('receipt', file);
      await api('/api/me/receipt', { method: 'POST', body: fd });
      toast('Struk terkirim. Status: Menunggu verifikasi.');
      router.refresh();
      onClose();
    } catch (er) {
      setErr((er as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      title={rejected ? 'Kirim ulang struk' : 'Upload struk'}
      titleId="rs-t"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>Nanti saja</button>
          <button type="submit" form="rs-form" className="btn pri" disabled={busy}><Ic n="i-upload" />{busy ? 'Mengirim...' : rejected ? 'Kirim ulang struk' : 'Kirim struk'}</button>
        </>
      }
    >
      <form id="rs-form" onSubmit={submit} noValidate style={{ display: 'contents' }}>
        <PayBox pay={pay} />
        <ReceiptField label="Struk baru" file={file} onFile={(f) => { setFile(f); if (f) setErr(''); }} error={err} onError={setErr} />
        <span className="hint">Setelah dikirim, statusmu menjadi Menunggu verifikasi.</span>
      </form>
    </Dialog>
  );
}
