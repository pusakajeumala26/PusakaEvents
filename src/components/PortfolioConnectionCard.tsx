'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import type { PortfolioStatus } from '@/lib/feedback-types';
import { Ic } from './Ic';
import { useToast } from './ToastProvider';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const time = (iso: string) => new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' });

/** Pengaturan koneksi MCP portfolio. API key hanya dikirim ke server dan tidak pernah ditampilkan kembali. */
export function PortfolioConnectionCard({ initial }: { initial: PortfolioStatus }) {
  const toast = useToast();
  const [status, setStatus] = useState(initial);
  const [url, setUrl] = useState(initial.url);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState<'save' | 'switch' | 'test' | 'clear' | null>(null);
  const [error, setError] = useState('');

  const patch = async (body: Record<string, unknown>, kind: 'save' | 'switch' | 'clear') => {
    setBusy(kind);
    setError('');
    try {
      const next = await api<PortfolioStatus>('/api/admin/portfolio', { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) });
      setStatus(next);
      setUrl(next.url);
      setKey('');
      return next;
    } catch (cause) {
      setError((cause as Error).message);
      return null;
    } finally {
      setBusy(null);
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const body: Record<string, unknown> = {};
    if (url.trim() !== status.url) body.url = url;
    if (key.trim()) body.apiKey = key;
    if (!Object.keys(body).length) { toast('Tidak ada perubahan.'); return; }
    if (await patch(body, 'save')) toast('Koneksi disimpan.');
  };

  const toggle = async () => {
    const next = await patch({ connected: !status.connected }, 'switch');
    if (next) toast(next.connected ? 'Portfolio disambungkan.' : 'Portfolio diputuskan. Feedback baru ditahan di antrean.');
  };

  const clearKey = async () => {
    if (await patch({ clearKey: true }, 'clear')) toast('API key dihapus.');
  };

  const test = async () => {
    setBusy('test');
    setError('');
    try {
      const out = await api<{ result: { ok: boolean; note: string }; status: PortfolioStatus }>('/api/admin/portfolio/test', { method: 'POST' });
      setStatus(out.status);
      toast(out.result.ok ? 'Koneksi berhasil.' : 'Koneksi gagal. Lihat keterangan di bawah.', out.result.ok ? 'ok' : 'error');
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const last = status.lastTest;
  const ready = Boolean(status.url && status.hasKey);
  return (
    <section className="card" aria-labelledby="pf-title">
      <h2 id="pf-title">Koneksi portfolio (MCP)</h2>
      <p className="hint">Feedback publik diteruskan ke portfolio lewat MCP. Pengaturan ini disimpan di database, bukan di environment.</p>

      <form className="pf-form" onSubmit={save} noValidate>
        <div className="f">
          <label className="lbl" htmlFor="pf-url">URL MCP</label>
          <input className="inp" id="pf-url" type="url" inputMode="url" autoComplete="off" spellCheck={false} placeholder="https://contoh.vercel.app/api/mcp" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div className="f">
          <label className="lbl" htmlFor="pf-key">API key</label>
          <input
            className="inp"
            id="pf-key"
            type="password"
            autoComplete="new-password"
            spellCheck={false}
            placeholder={status.hasKey ? `Tersimpan (berakhir ${status.keyHint ?? '****'}). Isi untuk mengganti.` : 'Tempel API key'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            aria-describedby="pf-key-h"
          />
          <span className="hint" id="pf-key-h">
            {status.hasKey ? `Tersimpan terenkripsi: ${'•'.repeat(8)}${status.keyHint ?? ''}. Key tidak pernah ditampilkan lagi.` : 'Disimpan terenkripsi di server.'}
          </span>
        </div>
        {status.keyUnreadable && <div className="note" role="alert"><Ic n="i-alert" /><div>API key tersimpan tidak bisa dibaca (SESSION_SECRET berubah). Masukkan key lagi.</div></div>}
        {error && <div className="note" role="alert"><Ic n="i-alert" /><div>{error}</div></div>}
        <div className="acts">
          <button type="submit" className="btn" disabled={busy !== null}>{busy === 'save' ? 'Menyimpan...' : 'Simpan'}</button>
          <button type="button" className="btn ghost" onClick={test} disabled={busy !== null || !ready}>{busy === 'test' ? 'Menguji...' : 'Tes koneksi'}</button>
          {status.hasKey && <button type="button" className="btn ghost" onClick={clearKey} disabled={busy !== null}>Hapus key</button>}
        </div>
      </form>

      <div className="srow">
        <div className="t">
          <b id="pf-sw-l">{status.connected ? 'Tersambung' : 'Terputus'}</b>
          <span className="hint">{status.connected ? 'Feedback baru dikirim ke portfolio.' : 'Feedback baru disimpan dan menunggu di antrean, tidak dikirim.'}</span>
        </div>
        <button type="button" className="swt" role="switch" aria-checked={status.connected} aria-labelledby="pf-sw-l" onClick={toggle} disabled={busy !== null || (!status.connected && !ready)} />
      </div>

      <div className="pf-status" role="status" aria-live="polite">
        <b>Status terakhir</b>
        {last ? (
          <>
            <span className={`chip ${last.ok ? 'ok' : 'rj'}`}><Ic n={last.ok ? 'i-check' : 'i-alert'} />{last.ok ? 'Berhasil' : 'Gagal'}</span>
            <span className="hint num">{time(last.at)}{last.ms != null ? ` · ${last.ms} ms` : ''}</span>
            {last.note && <span className="hint">{last.note}</span>}
          </>
        ) : <span className="hint">Belum pernah diuji.</span>}
      </div>

      <div className="srow">
        <div className="t">
          <b>Antrean feedback</b>
          <span className="hint num">{status.queue.queued} menunggu · {status.queue.failed} gagal · {status.queue.sent} terkirim</span>
        </div>
        <Link className="btn ghost sm" href="/feedback">Lihat daftar</Link>
      </div>
    </section>
  );
}
