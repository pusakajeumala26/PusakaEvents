'use client';

import { useEffect, useState } from 'react';

const KEY = 'pe-splash-seen';

/** Splash singkat saat aplikasi dibuka; tidak diulang selama sesi tab yang sama. */
export function Splash() {
  const [phase, setPhase] = useState<'show' | 'out' | 'gone'>('show');

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === '1';
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* private mode */
    }
    const t1 = setTimeout(() => setPhase('out'), seen ? 0 : 900);
    const t2 = setTimeout(() => setPhase('gone'), seen ? 50 : 1300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === 'gone') return null;
  return (
    <div className={phase === 'out' ? 'splash out' : 'splash'} role="status" aria-label="Memuat PusakaEvent">
      <img src="/brand/logo.webp?v=3" alt="" width={140} height={140} />
      <b>PusakaEvent</b>
      <div className="ld" aria-hidden="true">
        <i />
      </div>
    </div>
  );
}
