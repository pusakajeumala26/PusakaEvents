'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { RECEIPT_LIMIT_LABEL } from '@/lib/constants';
import { compressReceipt, prettySize } from '@/lib/receipt-client';
import { Ic } from './Ic';

/** Pilih struk: dikompres ke WebP di browser, dengan pratinjau dan pesan error inline. */
export function ReceiptField({
  label = 'Struk transfer', file, onFile, error, onError,
}: {
  label?: string;
  file: File | null;
  onFile: (f: File | null) => void;
  error?: string;
  onError: (msg: string) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [oversize, setOversize] = useState<{ name: string; size: number } | null>(null);

  useEffect(() => {
    if (!file) return setPreview(null);
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    setOversize(null);
    onError('');
    try {
      onFile(await compressReceipt(f));
    } catch (e) {
      onFile(null);
      setOversize({ name: f.name, size: f.size });
      onError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const shown = file ?? null;
  return (
    <div className="f">
      <span className="lbl" id={`${id}-l`}>{label}</span>
      <input ref={input} id={id} className="sr" type="file" accept="image/*" aria-labelledby={`${id}-l`} aria-describedby={`${id}-h`} onChange={(e) => pick(e.target.files?.[0])} />
      {shown || oversize ? (
        <div className="file" role="group" aria-labelledby={`${id}-l`}>
          <span className="thumb" aria-hidden="true">{preview && shown && <img src={preview} alt="" />}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ display: 'block', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shown?.name ?? oversize?.name}</b>
            <span className="hint num">{shown ? `${prettySize(shown.size)} · WebP` : prettySize(oversize!.size)}</span>
          </div>
          <label className="btn ghost sm" htmlFor={id} style={{ cursor: 'pointer' }}>Ganti</label>
        </div>
      ) : (
        <label className="drop" htmlFor={id} style={{ cursor: 'pointer' }}>
          <span className="ico-b"><Ic n="i-upload" /></span>
          <div style={{ minWidth: 0 }}>
            <b style={{ display: 'block', fontWeight: 600 }}>{busy ? 'Memproses gambar...' : 'Pilih foto struk'}</b>
            <span className="hint">Ketuk untuk memilih atau memotret</span>
          </div>
        </label>
      )}
      {error ? (
        <span className="emsg" id={`${id}-h`} role="alert"><Ic n="i-alert" />{error}</span>
      ) : (
        <span className="hint" id={`${id}-h`}>{busy ? 'Mengompres struk...' : `JPG, PNG, atau WebP, maks. ${RECEIPT_LIMIT_LABEL}.`}</span>
      )}
    </div>
  );
}
