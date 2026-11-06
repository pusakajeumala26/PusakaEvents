import { z } from 'zod';
import { COUNTRY_CODES, PASSWORD_MIN, SUBJECT_MAX } from './constants';
import { titleCase } from './format';

/** Hanya digit, tanpa nol di depan. "0812-3456" -> "8123456" */
export const normalizePhone = (v: string) => v.replace(/\D/g, '').replace(/^0+/, '');

export const nameField = z
  .string()
  .trim()
  .min(3, 'Tulis nama lengkap, minimal 3 huruf.')
  .max(80, 'Nama terlalu panjang (maks. 80 huruf).')
  .transform(titleCase);

export const countryField = z.enum(COUNTRY_CODES, { errorMap: () => ({ message: 'Pilih kode negara.' }) });

export const phoneField = z
  .string()
  .transform(normalizePhone)
  .pipe(z.string().min(8, 'Nomor terlalu pendek. Contoh: 812 3456 7890.').max(15, 'Nomor terlalu panjang.'));

export const genderField = z.enum(['L', 'P'], { errorMap: () => ({ message: 'Pilih gender.' }) });

export const subjectField = z.string().trim().max(SUBJECT_MAX, `Maksimal ${SUBJECT_MAX} karakter.`);

export const memberFields = z.object({
  name: nameField,
  countryCode: countryField,
  phone: phoneField,
  subject: subjectField,
  gender: genderField,
});

export const memberPassword = z
  .string()
  .min(PASSWORD_MIN, `Password minimal ${PASSWORD_MIN} karakter.`)
  .max(72, 'Password maksimal 72 karakter.');

export const adminPassword = z
  .string()
  .min(PASSWORD_MIN, `Password admin minimal ${PASSWORD_MIN} karakter.`)
  .max(72, 'Password maksimal 72 karakter.');

export const settingsPatch = z
  .object({
    letingName: z.string().trim().min(2, 'Nama leting minimal 2 huruf.').max(60, 'Nama leting terlalu panjang.'),
    amount: z.number().int('Nominal harus bilangan bulat.').min(1000, 'Nominal minimal Rp1.000.').max(10_000_000, 'Nominal terlalu besar.'),
    target: z.number().int('Target harus bilangan bulat.').min(1, 'Target minimal 1.').max(5000, 'Target maksimal 5000.'),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid.').nullable(),
    registrationOpen: z.boolean(),
    bankName: z.string().trim().min(2, 'Isi nama bank / QRIS.').max(40, 'Nama bank terlalu panjang.'),
    accountNumber: z
      .string()
      .trim()
      .regex(/^[0-9 -]{5,30}$/, 'No. rekening hanya angka (5-30 digit).'),
    accountName: z.string().trim().min(2, 'Isi nama penerima.').max(60, 'Nama penerima terlalu panjang.'),
  })
  .partial();

export const periodCloseBody = z.object({
  confirmName: z.string().trim().min(1).max(80),
  confirmStartedAt: z.string().datetime().optional(),
  password: adminPassword,
  archivedReceiptCount: z.number().int().min(0).max(100_000),
  archivedMemberCount: z.number().int().min(0).max(100_000).optional(),
  newPeriod: z.object({
    name: z.string().trim().min(2).max(80),
    amount: z.number().int().min(1000).max(10_000_000),
    targetCount: z.number().int().min(1).max(5000),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
      const [year, month, day] = value.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    }, 'Tanggal tenggat tidak valid.').nullable(),
  }),
});

export const reviewBody = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve') }),
  z.object({
    action: z.literal('reject'),
    reason: z.string().trim().min(3, 'Tulis alasan penolakan (wajib).').max(300, 'Alasan maksimal 300 karakter.'),
  }),
]);

/** Satu baris impor (kolom: nama, no_hp, kode_negara, gender, subjek, password opsional). */
export const importRow = z.object({
  name: nameField,
  countryCode: countryField,
  phone: phoneField,
  gender: genderField,
  subject: subjectField,
});
