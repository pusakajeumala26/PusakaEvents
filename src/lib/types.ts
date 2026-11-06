export type Gender = 'L' | 'P';
export type PayStatus = 'BELUM' | 'MENUNGGU' | 'TERVERIFIKASI' | 'DITOLAK';
export type EventType = 'DAFTAR' | 'IMPOR' | 'UPLOAD' | 'KIRIM_ULANG' | 'DISETUJUI' | 'DITOLAK';

/** Status selalu tampil dengan label + ikon, tidak hanya warna. */
export const STATUS_META: Record<PayStatus, { label: string; chip: string; icon: string }> = {
  TERVERIFIKASI: { label: 'Terverifikasi', chip: 'chip ok', icon: 'i-check' },
  MENUNGGU: { label: 'Menunggu', chip: 'chip pe', icon: 'i-clock' },
  DITOLAK: { label: 'Ditolak', chip: 'chip rj', icon: 'i-x' },
  BELUM: { label: 'Belum input', chip: 'chip no', icon: 'i-dash' },
};

export type MemberView = {
  id: string;
  name: string;
  /** Untuk non-admin: "+62 •••• 4821". Untuk admin: nomor lengkap. */
  phoneDisplay: string;
  status: PayStatus;
  createdAt: string;
  receiptAt: string | null;
  /** Hanya terisi untuk admin */
  countryCode?: string;
  phone?: string;
  subject?: string;
  gender?: Gender;
  rejectReason?: string | null;
  hasReceipt?: boolean;
  hasPassword?: boolean;
};

export type EventView = { id: string; type: EventType; note: string | null; createdAt: string };

export type DayStat = { label: string; n: number; today: boolean };

export type Counts = { total: number; TERVERIFIKASI: number; MENUNGGU: number; DITOLAK: number; BELUM: number };

export type Stats = {
  counts: Counts;
  target: number;
  uploaded: number;
  uploadedPct: number;
  days: DayStat[];
  peakLabel: string;
  peakN: number;
};

export type Rekap = {
  amount: number;
  target: number;
  collected: number;
  pending: number;
  goal: number;
  shortfall: number;
  pct: number;
  counts: Counts;
};

export type SettingsView = {
  letingName: string;
  amount: number;
  target: number;
  /** YYYY-MM-DD (WIB) atau string kosong */
  deadline: string;
  registrationOpen: boolean;
  bankName: string;
  accountNumber: string;
  accountName: string;
};

/** Info rekening untuk publik (halaman utama & form). */
export type PayInfo = { bankName: string; accountNumber: string; accountName: string; amount: number };

export type SelfView = {
  id: string;
  name: string;
  phoneDisplay: string;
  status: PayStatus;
  rejectReason: string | null;
  receiptAt: string | null;
};
