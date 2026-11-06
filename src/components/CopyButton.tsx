'use client';

import { useEffect, useRef, useState } from 'react';
import { copyText } from '@/lib/api-client';
import { useToast } from './ToastProvider';
import { Ic } from './Ic';

export function CopyButton({ value, label = 'Salin', successMessage = 'Nomor rekening tersalin' }: {
  value: string;
  label?: string;
  successMessage?: string;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const copy = async () => {
    if (!(await copyText(value))) {
      toast('Gagal menyalin, salin manual', 'error');
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setCopied(true);
    timer.current = setTimeout(() => { setCopied(false); timer.current = null; }, 2000);
  };

  return (
    <>
      <button type="button" className={`btn sm copy-btn${copied ? ' copied' : ''}`} aria-label={copied ? successMessage : `${label} ${value}`} onClick={copy}>
        <Ic n={copied ? 'i-check' : 'i-copy'} />{copied ? 'Tersalin' : label}
      </button>
      <span className="sr" aria-live="polite" aria-atomic="true">{copied ? successMessage : ''}</span>
    </>
  );
}
