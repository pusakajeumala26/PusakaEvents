'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { postJson } from '@/lib/api-client';
import { Ic } from './Ic';
import { PageHeader } from './AppShell';

/** Gerbang password untuk halaman admin. */
export function AdminGate({ title }: { title: string }) {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw) return setErr('Isi password admin.');
    setBusy(true);
    setErr('');
    try {
      await postJson('/api/admin/login', { password: pw });
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title={title} sub="Khusus admin" />
      <div className="gate">
        <form className="gcard" onSubmit={submit} noValidate>
          <span className="ico-b"><Ic n="i-lock" size={28} /></span>
          <h2>Halaman admin</h2>
          <p className="sub">Masukkan password admin untuk membuka {title.toLowerCase()}.</p>
          <div className="f" style={{ width: '100%', textAlign: 'left' }}>
            <label className="lbl" htmlFor="apw">Password admin</label>
            <div className="pw">
              <input
                className={`inp${err ? ' bad' : ''}`}
                id="apw"
                type={show ? 'text' : 'password'}
                value={pw}
                autoComplete="current-password"
                aria-invalid={!!err}
                aria-describedby={err ? 'apw-e' : undefined}
                onChange={(e) => setPw(e.target.value)}
                data-autofocus
              />
              <button type="button" className="ib" aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'} onClick={() => setShow((s) => !s)}>
                <Ic n="i-eye" />
              </button>
            </div>
            {err && <span className="emsg" id="apw-e" role="alert"><Ic n="i-alert" />{err}</span>}
          </div>
          <button type="submit" className="btn pri blk" disabled={busy}>
            <Ic n="i-lock" />{busy ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>
      </div>
    </>
  );
}
