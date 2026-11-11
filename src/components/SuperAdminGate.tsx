'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { postJson } from '@/lib/api-client';
import { Ic } from './Ic';
import { PageHeader } from './AppShell';

/** Gerbang password super admin (terpisah dari password admin biasa). */
export function SuperAdminGate({ title }: { title: string }) {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw) return setErr('Isi password super admin.');
    setBusy(true);
    setErr('');
    try {
      await postJson('/api/admin/super-admin/verify', { password: pw });
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title={title} sub="Khusus super admin" />
      <div className="gate">
        <form className="gcard" onSubmit={submit} noValidate>
          <span className="ico-b"><Ic n="i-lock" size={28} /></span>
          <h2>Halaman super admin</h2>
          <p className="sub">Masukkan password super admin untuk membuka {title}. Password ini berbeda dari password admin.</p>
          <div className="f" style={{ width: '100%', textAlign: 'left' }}>
            <label className="lbl" htmlFor="spw">Password super admin</label>
            <div className="pw">
              <input
                className={`inp${err ? ' bad' : ''}`}
                id="spw"
                type={show ? 'text' : 'password'}
                value={pw}
                autoComplete="off"
                aria-invalid={!!err}
                aria-describedby={err ? 'spw-e' : undefined}
                onChange={(e) => setPw(e.target.value)}
                data-autofocus
              />
              <button type="button" className="ib" aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'} onClick={() => setShow((s) => !s)}>
                <Ic n="i-eye" />
              </button>
            </div>
            {err && <span className="emsg" id="spw-e" role="alert"><Ic n="i-alert" />{err}</span>}
          </div>
          <button type="submit" className="btn pri blk" disabled={busy}>
            <Ic n="i-lock" />{busy ? 'Memeriksa...' : 'Buka'}
          </button>
        </form>
      </div>
    </>
  );
}
