'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { postJson } from '@/lib/api-client';
import { initials, rupiah, whatsappLink } from '@/lib/format';
import type { MemberView } from '@/lib/types';
import { Ic } from './Ic';
import { useToast } from './ToastProvider';

const QUICK = ['Nominal tidak sesuai', 'Struk buram', 'Bukan struk kas'];

/** Periksa struk: setujui, atau tolak dengan alasan wajib + (opsional) buka WhatsApp. */
export function ReviewPanel({
  member, amount, sub, onDone,
}: {
  member: MemberView;
  amount: number;
  sub?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => {
    setReason('');
    setErr('');
  }, [member.id]);

  const first = member.name.split(' ')[0];
  const why = reason.trim().replace(/[.\s]+$/, '').replace(/^./, (c) => c.toLowerCase());
  const message = `Halo ${first}, struk kas ${rupiah(amount)} kamu belum bisa disetujui${why ? `: ${why}` : ''}. Mohon kirim ulang lewat PusakaEvent${origin ? ` (${origin})` : ''}.`;

  const act = async (action: 'approve' | 'reject', openWa = false) => {
    if (action === 'reject' && reason.trim().length < 3) {
      setErr('Alasan penolakan wajib diisi.');
      return;
    }
    setBusy(true);
    setErr('');
    // Buka tab WhatsApp lebih dulu (di dalam gestur klik) agar tidak diblokir pop-up blocker.
    const win = action === 'reject' && openWa && member.countryCode && member.phone
      ? window.open(whatsappLink(member.countryCode, member.phone, message), '_blank', 'noopener,noreferrer')
      : null;
    try {
      await postJson(`/api/members/${member.id}/verify`, action === 'approve' ? { action } : { action, reason: reason.trim() });
      toast(action === 'approve' ? `${member.name} disetujui.` : `${member.name} ditolak.`);
      router.refresh();
      onDone?.();
    } catch (e) {
      win?.close();
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Pemeriksaan struk" className="card" style={{ gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="av">{initials(member.name)}</span>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: 18, overflowWrap: 'anywhere' }}>{member.name}</h2>
          <span className="num" style={{ fontSize: 13, color: 'var(--mute)' }}>{sub ?? `${member.phoneDisplay} · ${rupiah(amount)}`}</span>
        </div>
      </div>
      <a className="rcpt has" href={`/api/members/${member.id}/receipt`} target="_blank" rel="noopener noreferrer" aria-label="Buka struk ukuran penuh di tab baru">
        <img src={`/api/members/${member.id}/receipt`} alt={`Struk transfer ${member.name}`} />
        <span className="hint">Ketuk untuk memperbesar</span>
      </a>
      <div className="f">
        <label className="lbl" htmlFor={`alasan-${member.id}`}>Alasan penolakan <i>(wajib jika ditolak)</i></label>
        <div className="qr" role="group" aria-label="Alasan cepat">
          {QUICK.map((q) => (
            <button key={q} type="button" className={reason === q ? 'on' : undefined} aria-pressed={reason === q} onClick={() => { setReason(q); setErr(''); }}>{q}</button>
          ))}
        </div>
        <textarea
          className={`inp${err ? ' bad' : ''}`}
          id={`alasan-${member.id}`}
          value={reason}
          maxLength={300}
          aria-invalid={!!err}
          aria-describedby={err ? `alasan-e-${member.id}` : undefined}
          onChange={(e) => { setReason(e.target.value); setErr(''); }}
          placeholder="Contoh: Nominal pada struk tidak sesuai."
        />
        {err && <span className="emsg" id={`alasan-e-${member.id}`} role="alert"><Ic n="i-alert" />{err}</span>}
      </div>
      <div className="wa"><b>Pesan WhatsApp</b><br />{message}</div>
      <div className="acts">
        <button type="button" className="btn pri" disabled={busy} onClick={() => act('approve')}><Ic n="i-check" />Setujui</button>
        <button type="button" className="btn" disabled={busy} onClick={() => act('reject')}><Ic n="i-x" />Tolak</button>
        <button type="button" className="btn ghost" disabled={busy} onClick={() => act('reject', true)}><Ic n="i-chat" />Tolak &amp; buka WhatsApp</button>
      </div>
    </section>
  );
}
