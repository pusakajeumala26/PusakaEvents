import { APP_TZ_OFFSET_MS } from './constants';

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');

export const rupiah = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID');

export const initials = (name: string) => {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase();
};

/** "nurul  aini" -> "Nurul Aini" (konsisten untuk nama yang diketik huruf kecil/KAPITAL). */
export function titleCase(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|[\s'’.-])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

export const fmtPhone = (digits: string) => digits.replace(/(\d{3,4})(?=\d)/g, '$1 ').trim();

export const maskPhone = (countryCode: string, digits: string) => `${countryCode} •••• ${digits.slice(-4)}`;

export const whatsappLink = (countryCode: string, digits: string, text?: string) =>
  `https://wa.me/${countryCode.replace('+', '')}${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

/** Nomor lokal Indonesia "08xx" -> "628xx" untuk tautan wa.me */
export const idWa = (local: string) => '62' + local.replace(/\D/g, '').replace(/^0+/, '');

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** "Rab, 4 Nov 2026 · 14.12" dalam WIB (konsisten di server dan browser). */
export function formatDateTime(iso: string): string {
  const w = new Date(new Date(iso).getTime() + APP_TZ_OFFSET_MS);
  return `${DAYS[w.getUTCDay()]}, ${w.getUTCDate()} ${MONTHS[w.getUTCMonth()]} ${w.getUTCFullYear()} · ${pad(w.getUTCHours())}.${pad(w.getUTCMinutes())}`;
}

/** "Jum, 20 Nov 2026" dari YYYY-MM-DD */
export function formatDateOnly(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  if (!y || !m || !d) return 'Belum diatur';
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DAYS[dow]}, ${d} ${MONTHS[m - 1]} ${y}`;
}

/** "Hari ini, 14.20" / "Kemarin, 09.05" / "3 hari lalu" */
export function formatWhen(iso: string, now: number = Date.now()): string {
  const t = new Date(iso).getTime();
  const dayOf = (ms: number) => Math.floor((ms + APP_TZ_OFFSET_MS) / DAY_MS);
  const diff = dayOf(now) - dayOf(t);
  const w = new Date(t + APP_TZ_OFFSET_MS);
  const hm = `${pad(w.getUTCHours())}.${pad(w.getUTCMinutes())}`;
  if (diff <= 0) return `Hari ini, ${hm}`;
  if (diff === 1) return `Kemarin, ${hm}`;
  return `${diff} hari lalu`;
}
