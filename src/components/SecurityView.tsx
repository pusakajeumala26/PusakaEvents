'use client';

import { useState } from 'react';
import { postJson } from '@/lib/api-client';
import { PASSWORD_MIN } from '@/lib/constants';
import { PageHeader } from './AppShell';
import { Ic } from './Ic';
import { PeriodManager } from './PeriodManager';
import { useToast } from './ToastProvider';

export function SecurityView() {
  const toast = useToast();
  const [pw, setPw] = useState('');
  const [pwErr, setPwErr] = useState('');

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

  return (
    <>
      <PageHeader title="Security" sub="Password admin dan penutupan periode event" mobileSub="Password dan periode" />
      <div className="content">
        <div className="sgrid">
          <div className="setting-left">
            <PeriodManager />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <section className="card"><h2>Keamanan admin</h2>
              <div className="f">
                <label className="lbl" htmlFor="npw">Password admin baru</label>
                <input className={`inp${pwErr ? ' bad' : ''}`} id="npw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={!!pwErr} aria-describedby="npw-h" />
                {pwErr ? <span className="emsg" id="npw-h" role="alert"><Ic n="i-alert" />{pwErr}</span> : <span className="hint" id="npw-h">Minimal {PASSWORD_MIN} karakter.</span>}
              </div>
              <button type="button" className="btn" onClick={changePw}>Ganti password</button>
              <p className="hint">Setelah diganti, sesi admin di perangkat lain berakhir.</p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
