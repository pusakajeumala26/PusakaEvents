'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Ic } from './Ic';

type Tone = 'ok' | 'error';
type ShowToast = (message: string, tone?: Tone) => void;

const ToastContext = createContext<ShowToast>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: Tone } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback<ShowToast>((message, tone = 'ok') => {
    clearTimeout(timer.current);
    setToast({ message, tone });
    timer.current = setTimeout(() => setToast(null), tone === 'error' ? 5000 : 2800);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div role="status" aria-live={toast?.tone === 'error' ? 'assertive' : 'polite'}>
        {toast && (
          <div className={toast.tone === 'error' ? 'toast err' : 'toast'}>
            <Ic n={toast.tone === 'error' ? 'i-alert' : 'i-check'} size={18} />
            <div className="t">{toast.message}</div>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
