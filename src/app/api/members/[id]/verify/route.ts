import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { assertSameOrigin, HttpError, json, readJson, route } from '@/lib/http';
import { toView } from '@/lib/members';
import { reviewBody } from '@/lib/validation';
import { lockPeriodMutations } from '@/lib/period-lock';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

/** Admin menyetujui struk, atau menolak dengan alasan wajib (status menjadi Ditolak). */
export const POST = route<Ctx>(async (req, ctx) => {
  assertSameOrigin(req);
  await requireAdmin();
  const { id } = await ctx.params;
  const body = reviewBody.parse(await readJson(req));

  const updated = await db.$transaction(async (tx) => {
    await lockPeriodMutations(tx);
    const m = await tx.member.findUnique({ where: { id } });
    if (!m) throw new HttpError(404, 'Anggota tidak ditemukan.');
    if (!m.receiptKey) throw new HttpError(409, 'Anggota ini belum mengunggah struk.');
    const now = new Date();
    return body.action === 'approve'
      ? tx.member.update({
          where: { id },
          data: {
            status: 'TERVERIFIKASI',
            rejectReason: null,
            reviewedAt: now,
            events: { create: [{ type: 'DISETUJUI', note: 'Disetujui admin' }] },
          },
        })
      : tx.member.update({
          where: { id },
          data: {
            status: 'DITOLAK',
            rejectReason: body.reason,
            reviewedAt: now,
            events: { create: [{ type: 'DITOLAK', note: body.reason }] },
          },
        });
  });
  return json({ member: toView(updated, true) });
});
