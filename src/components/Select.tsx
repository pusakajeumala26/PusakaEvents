'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Ic } from './Ic';

export type Opt = { value: string; label: string };

type Props = {
  value: string;
  options: readonly Opt[];
  onChange: (v: string) => void;
  /** Label aksesibel jika tidak ada <label htmlFor=id> */
  ariaLabel?: string;
  id?: string;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  align?: 'left' | 'right';
  menuWidth?: number;
  className?: string;
  invalid?: boolean;
  mono?: boolean;
};

/** Dropdown kustom (satu chevron) dengan listbox yang bisa dioperasikan keyboard. */
export function Select({
  value, options, onChange, ariaLabel, id, placeholder = 'Pilih', searchable, searchPlaceholder = 'Cari',
  align = 'left', menuWidth, className = '', invalid, mono,
}: Props) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);

  const shown = useMemo(
    () => (q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options),
    [options, q],
  );
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    const sel = list.current?.querySelector<HTMLElement>('[aria-selected=true]');
    (sel ?? list.current?.querySelector<HTMLElement>('[role=option]'))?.focus();
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const close = (refocus = true) => {
    setOpen(false);
    setQ('');
    if (refocus) btn.current?.focus();
  };

  const onListKey = (e: React.KeyboardEvent) => {
    const items = [...(list.current?.querySelectorAll<HTMLElement>('[role=option]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[Math.min(items.length - 1, i + 1)]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (i <= 0 && searchable) list.current?.querySelector<HTMLElement>('input')?.focus();
      else items[Math.max(0, i - 1)]?.focus();
    } else if (e.key === 'Tab') {
      close(false);
    }
  };

  return (
    <div className={`pop ${className}`.trim()} ref={root}>
      <button
        ref={btn}
        type="button"
        id={id}
        className={`sel${open ? ' open' : ''}${invalid ? ' bad' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${uid}-lb` : undefined}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className={mono ? 'num' : undefined} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current?.label ?? <span style={{ color: '#737373' }}>{placeholder}</span>}
        </span>
        <Ic n="i-down" />
      </button>
      {open && (
        <div
          id={`${uid}-lb`}
          ref={list}
          className="lb"
          role="listbox"
          aria-label={ariaLabel}
          onKeyDown={onListKey}
          style={{ ...(menuWidth ? { width: menuWidth } : {}), ...(align === 'right' ? { left: 'auto', right: 0 } : {}) }}
        >
          {searchable && (
            <div className="srch">
              <Ic n="i-search" />
              <input
                className="inp"
                type="search"
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    list.current?.querySelector<HTMLElement>('[role=option]')?.focus();
                  }
                }}
              />
            </div>
          )}
          {shown.length === 0 && <div className="hint" style={{ padding: '10px 12px' }}>Tidak ada hasil.</div>}
          {shown.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={`op${o.value === value ? ' on' : ''}`}
              onClick={() => {
                onChange(o.value);
                close();
              }}
            >
              <span>{o.label}</span>
              {o.value === value && <Ic n="i-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
