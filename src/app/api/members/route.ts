import { randomUUID } from 'node:crypto';
import { createMemberSession, hashPassword } from '@/lib/auth';
import { db } from '@/lib/db';
import { assertSameOrigin, clientIp, formString, HttpError, json, rateLimit, route } from '@/lib/http';
import { normalizeReceipt } from '@/lib/image-server';
import { isUniqueViolation, parseMemberFields } from '@/lib/member-input';
import { loadSettings } from '@/lib/settings';
import { deleteObject, putReceipt } from '@/lib/storage';
import { memberPassword } from '@/lib/validation';

export const runtime = 'nodejs';
export const maxDuration = 30;

/** Pendaftaran anggota: data + password + struk sekaligus. Status awal: Menunggu verifikasi. */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req);
  rateLimit(`register:${clientIp(req)}`, 10, 10 * 60_000);

  const settings = await loadSettings();
  if (!settings.registrationOpen) throw new HttpError(403, 'Pendaftaran sedang ditutup oleh admin.');

  const form = await req.formData();
  const fields = parseMemberFields(form);
  const password = memberPassword.parse(formString(form.get('password')));
  const receipt = await normalizeReceipt(form.get('receipt'));

  const exists = await db.member.findUnique({
    where: { countryCode_phone: { countryCode: fields.countryCode, phone: fields.phone } },
    select: { id: true },
  });
  if (exists) throw new HttpError(409, 'Nomor ini sudah terdaftar. Gunakan "Buka data saya" untuk melihat statusnya.');

  const id = randomUUID();
  const key = `struk/${id}/${Date.now()}.webp`;
  await putReceipt(key, receipt);

  try {
    const now = new Date();
    await db.member.create({
      data: {
        id,
        ...fields,
        passwordHash: await hashPassword(password),
        status: 'MENUNGGU',
        receiptKey: key,
        receiptAt: now,
        events: { create: [{ type: 'DAFTAR', note: 'Mendaftar & upload struk' }] },
      },
    });
  } catch (e) {
    await deleteObject(key);
    if (isUniqueViolation(e)) throw new HttpError(409, 'Nomor ini sudah terdaftar. Gunakan "Buka data saya".');
    throw e;
  }

  await createMemberSession(id);
  return json({ ok: true, id }, 201);
});
