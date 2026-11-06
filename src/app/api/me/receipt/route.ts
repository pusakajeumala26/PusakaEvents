import { requireSelf } from '@/lib/auth';
import { db } from '@/lib/db';
import { assertSameOrigin, clientIp, HttpError, json, rateLimit, route } from '@/lib/http';
import { normalizeReceipt } from '@/lib/image-server';
import { deleteObject, putReceipt } from '@/lib/storage';

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
  const resubmit = me.status === 'DITOLAK';
  try {
    await db.member.update({
      where: { id: me.id },
      data: {
        status: 'MENUNGGU',
        rejectReason: null,
        receiptKey: key,
        receiptAt: new Date(),
        events: { create: [{ type: resubmit ? 'KIRIM_ULANG' : 'UPLOAD', note: resubmit ? 'Mengirim ulang struk' : 'Mengunggah struk' }] },
      },
    });
  } catch (e) {
    await deleteObject(key);
    throw e;
  }
  await deleteObject(me.receiptKey);
  return json({ ok: true });
});
