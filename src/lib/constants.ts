/** Konstanta yang aman dipakai di server maupun browser. */

export const COUNTRY_OPTIONS = [
  { code: '+62', label: 'ID +62' },
  { code: '+60', label: 'MY +60' },
  { code: '+65', label: 'SG +65' },
  { code: '+966', label: 'SA +966' },
  { code: '+20', label: 'EG +20' },
  { code: '+90', label: 'TR +90' },
  { code: '+212', label: 'MA +212' },
  { code: '+1', label: 'US +1' },
] as const;

export const COUNTRY_CODES = ['+62', '+60', '+65', '+966', '+20', '+90', '+212', '+1'] as const;

/** WIB (Aceh) = UTC+7, tanpa DST. */
export const APP_TZ = 'Asia/Jakarta';
export const APP_TZ_OFFSET_MS = 7 * 60 * 60 * 1000;

export const SUBJECT_MAX = 120;
export const PASSWORD_MIN = 8;

/** Struk dikompres di browser ke WebP; batas body request Vercel adalah 4,5 MB. */
export const MAX_INPUT_BYTES = 10 * 1024 * 1024;
export const MAX_RECEIPT_BYTES = 4 * 1024 * 1024;
export const MAX_RECEIPT_SIDE = 1600;
/** Batas yang ditampilkan ke anggota di form (sebelum kompres). */
export const RECEIPT_LIMIT_LABEL = '10 MB';

export const ADMIN_CONTACTS = [
  { name: 'Ata Sidqi', title: 'Ketua Leting', phone: '08136173909' },
  { name: 'Alfiz Ilham', title: 'Sekretaris 1', phone: '085213896460' },
  { name: 'Raisya Zumara', title: 'Bendahara', phone: '081262040241' },
  { name: 'Naurah Syifa', title: 'Sekretaris 2', phone: '082277247480' },
] as const;

export const BENDAHARA_WA = '6281262040241';
