import { requireSelf } from '@/lib/auth';
import { db } from '@/lib/db';
import { assertSameOrigin, clientIp, HttpError, json, rateLimit, route } from '@/lib/http';
import { normalizeReceipt } from '@/lib/image-server';
import { deleteObject, putReceipt } from '@/lib/storage';
import { lockPeriodMutations } from '@/lib/period-lock';

export const runtime = 'nodejs';
export const maxDuration = 30;

/** Anggota yang sudah masuk mengirim (ulang) struk. Status kembali ke Menunggu verifikasi. */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req);
  rateLimit(`resubmit:${clientIp(req)}`, 15, 10 * 60_000);
  const me = await requireSelf();
  if (me.status === 'TERVERIFIKASI') throw new HttpError(409, 'Struk kamu sudah terverifikasi. Tidak perlu dikirim lagi.');

  const form = await req.formData();
  const receipt = await normalizeReceipt(form.get('receipt'));

  const key = `struk/${me.id}/${Date.now()}.webp`;
  await putReceipt(key, receipt);
  try {
    await db.$transaction(async (tx) => {
      await lockPeriodMutations(tx);
      const settings = await tx.setting.findUnique({ where: { id: 1 }, select: { registrationOpen: true } });
      if (!settings?.registrationOpen) throw new HttpError(403, 'Pendaftaran dan upload struk sedang ditutup oleh admin.');
      const current = await tx.member.findUnique({ where: { id: me.id }, select: { status: true } });
      if (!current) throw new HttpError(404, 'Data anggota tidak ditemukan.');
      if (current.status === 'TERVERIFIKASI') throw new HttpError(409, 'Struk kamu sudah terverifikasi. Tidak perlu dikirim lagi.');
      const resubmit = current.status === 'DITOLAK';
      await tx.member.update({
        where: { id: me.id },
        data: {
          status: 'MENUNGGU',
          rejectReason: null,
          receiptKey: key,
          receiptAt: new Date(),
          events: { create: [{ type: resubmit ? 'KIRIM_ULANG' : 'UPLOAD', note: resubmit ? 'Mengirim ulang struk' : 'Mengunggah struk' }] },
        },
      });
    });
  } catch (e) {
    await deleteObject(key);
    throw e;
  }
  await deleteObject(me.receiptKey);
  return json({ ok: true });
});
