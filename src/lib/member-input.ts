import { formString, HttpError } from './http';
import { memberFields } from './validation';

/** Baca & validasi field teks anggota dari FormData. */
export function parseMemberFields(form: FormData) {
  const r = memberFields.safeParse({
    name: formString(form.get('name')),
    countryCode: formString(form.get('countryCode')),
    phone: formString(form.get('phone')),
    subject: formString(form.get('subject')),
    gender: formString(form.get('gender')),
  });
  if (!r.success) throw new HttpError(422, r.error.issues[0]?.message ?? 'Data tidak valid.');
  return r.data;
}

export const isUniqueViolation = (e: unknown) => (e as { code?: string } | null)?.code === 'P2002';
