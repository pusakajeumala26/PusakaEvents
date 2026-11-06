'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { api, postJson } from '@/lib/api-client';
import { parseImportFile } from '@/lib/import-parse';
import { prettySize } from '@/lib/receipt-client';
import { Ic } from './Ic';
import { Dialog } from './MemberForms';
import { useToast } from './ToastProvider';

type Preview = {
  valid: number;
  duplicate: number;
  fix: number;
  items: { row: number; name: string; state: 'valid' | 'duplicate' | 'fix'; message?: string }[];
};

export function ImportModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<unknown[] | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setErr('');
    setPreview(null);
    setRows(null);
    setFile(f);
    setBusy(true);
    try {
      const parsed = await parseImportFile(f);
      setRows(parsed);
      setPreview(await postJson<Preview>('/api/admin/import', { rows: parsed, commit: false }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const commit = async () => {
    if (!rows) return;
    setBusy(true);
    try {
      const r = await api<{ imported: number }>('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, commit: true }),
      });
      toast(`${r.imported} anggota ditambahkan.`);
      router.refresh();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  const problems = preview?.items.filter((i) => i.state !== 'valid') ?? [];

  return (
    <Dialog
      title="Impor anggota"
      titleId="imp-t"
      wide
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>Batal</button>
          <button type="button" className="btn pri" disabled={busy || !preview || preview.valid === 0} onClick={commit}>
            <Ic n="i-upload" />{busy ? 'Memproses...' : `Impor ${preview?.valid ?? 0} anggota`}
          </button>
        </>
      }
    >
      <div className="srow">
        <span className="ico-b"><Ic n="i-download" /></span>
        <div className="t"><b>1. Unduh templat</b><span className="hint">Kolom: nama, no_hp, kode_negara, gender, subjek.</span></div>
        <a className="btn ghost sm" href="/api/admin/export?format=template">Unduh .csv</a>
      </div>
      <div className="f">
        <span className="lbl" id="imp-l">2. Unggah file</span>
        <input ref={input} id="imp-f" className="sr" type="file" accept=".xlsx,.csv,.json" aria-labelledby="imp-l" onChange={(e) => pick(e.target.files?.[0])} />
        <div className="file" role="group" aria-labelledby="imp-l">
          <span className="ico-b"><Ic n="i-file" /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ display: 'block', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file?.name ?? 'Belum ada file'}</b>
            <span className="hint num">{file ? prettySize(file.size) : '.xlsx, .csv, atau .json · maks. 500 baris'}</span>
          </div>
          <label className="btn ghost sm" htmlFor="imp-f" style={{ cursor: 'pointer' }}>{file ? 'Ganti' : 'Pilih file'}</label>
        </div>
        {err && <span className="emsg" role="alert"><Ic n="i-alert" />{err}</span>}
      </div>
      {preview && (
        <div className="f">
          <span className="lbl">3. Pratinjau</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="chip ok"><Ic n="i-check" size={14} />{preview.valid} valid</span>
            <span className="chip pe"><Ic n="i-clock" size={14} />{preview.duplicate} duplikat</span>
            <span className="chip rj"><Ic n="i-x" size={14} />{preview.fix} perlu diperbaiki</span>
          </div>
          {problems.length > 0 && (
            <div className="rows" style={{ maxHeight: 180, overflow: 'auto' }}>
              {problems.map((p) => (
                <div className="imp-row" key={p.row}>
                  <span className="hint num">#{p.row}</span>
                  <span className="t">{p.name}</span>
                  <span className="hint">{p.message}</span>
                </div>
              ))}
            </div>
          )}
          <span className="hint">Anggota yang diimpor berstatus Belum input. Mereka membuat password sendiri saat memilih Buka data saya.</span>
        </div>
      )}
    </Dialog>
  );
}
