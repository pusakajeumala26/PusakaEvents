'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import { Ic } from './Ic';
import { useToast } from './ToastProvider';

type SessionTime = { expiresAt: number; serverNow: number };
const CHANNEL = 'pusakaevent-admin-session';

export function AdminSessionGuard() {
  const router = useRouter();
  const toast = useToast();
  const [session, setSession] = useState<SessionTime | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [working, setWorking] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const offset = useRef(0);
  const exited = useRef(false);

  const sync = useCallback((value: SessionTime) => {
    offset.current = value.serverNow - Date.now();
    setSession(value);
    setRemaining(Math.max(0, Math.ceil((value.expiresAt - value.serverNow) / 1000)));
  }, []);

  const endSession = useCallback(async (broadcast = true) => {
    if (exited.current) return;
    exited.current = true;
    if (broadcast) channel.current?.postMessage({ type: 'logout' });
    try { await api('/api/admin/logout', { method: 'POST' }); } catch { /* cookie may already be expired */ }
    router.replace('/verifikasi?sesi=berakhir');
    router.refresh();
  }, [router]);

  useEffect(() => {
    channel.current = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL) : null;
    const currentChannel = channel.current;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'logout') void endSession(false);
      if (event.data?.type === 'extended' && typeof event.data.expiresAt === 'number' && typeof event.data.serverNow === 'number') {
        sync({ expiresAt: event.data.expiresAt, serverNow: event.data.serverNow });
      }
    };
    currentChannel?.addEventListener('message', onMessage);
    const load = async () => {
      try { sync(await api<SessionTime>('/api/admin/session')); }
      catch { await endSession(false); }
    };
    void load();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      currentChannel?.removeEventListener('message', onMessage);
      currentChannel?.close();
      channel.current = null;
    };
  }, [endSession, sync]);

  useEffect(() => {
    if (!session) return;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((session.expiresAt - (Date.now() + offset.current)) / 1000));
      setRemaining(seconds);
      if (seconds <= 0) void endSession();
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [session, endSession]);

  const open = remaining !== null && remaining <= 30;
  useEffect(() => {
    if (!open) return;
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); }
      if (event.key !== 'Tab' || !dialog.current) return;
      const controls = [...dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled])')];
      if (!controls.length) return;
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open]);

  const [announcement, setAnnouncement] = useState('');
  const announced = useRef(new Set<number>());
  useEffect(() => {
    if (!open || remaining === null) return;
    for (const value of [30, 10, 5]) {
      const thresholdReached = value === 30
        ? remaining <= 30 && remaining > 10
        : value === 10 ? remaining <= 10 && remaining > 5 : remaining <= 5;
      if (thresholdReached && !announced.current.has(value)) {
        announced.current.add(value);
        setAnnouncement(`Sesi admin berakhir dalam ${value} detik.`);
      }
    }
  }, [open, remaining]);

  const extend = async () => {
    setWorking(true);
    try {
      const value = await api<SessionTime>('/api/admin/session', { method: 'POST' });
      sync(value);
      announced.current.clear();
      channel.current?.postMessage({ type: 'extended', ...value });
      toast('Sesi admin diperpanjang.');
    } catch {
      await endSession();
    } finally { setWorking(false); }
  };

  if (!open) return null;
  return (
    <div className="scrim session-scrim">
      <section className="dlg session-dialog" role="alertdialog" aria-modal="true" aria-labelledby="session-title" aria-describedby="session-copy" ref={dialog} tabIndex={-1}>
        <header><h2 id="session-title">Sesi admin akan berakhir</h2><Ic n="i-alert" /></header>
        <div className="bd">
          <p id="session-copy">Sisa waktu: <strong className="num">{remaining ?? 0} detik</strong>.</p>
          <p className="sr" aria-live="polite" aria-atomic="true">{announcement}</p>
        </div>
        <footer>
          <button type="button" className="btn ghost" disabled={working} onClick={() => void endSession()}>Keluar sekarang</button>
          <button type="button" className="btn pri" disabled={working} onClick={extend}><Ic n="i-check" />{working ? 'Memperpanjang...' : 'Tetap di mode admin'}</button>
        </footer>
      </section>
    </div>
  );
}
