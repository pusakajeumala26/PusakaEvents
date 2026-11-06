import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { assertSameOrigin, HttpError, json, route } from '@/lib/http';
import { deleteObject } from '@/lib/storage';
import { lockPeriodMutations } from '@/lib/period-lock';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

/** Hapus anggota beserta struknya (admin). */
export const DELETE = route<Ctx>(async (req, ctx) => {
  assertSameOrigin(req);
  await requireAdmin();
  const { id } = await ctx.params;
  const startingPeriod = await db.setting.findUnique({ where: { id: 1 }, select: { periodStartedAt: true } });
  if (!startingPeriod) throw new HttpError(503, 'Pengaturan periode belum tersedia.');
  const receiptKey = await db.$transaction(async (tx) => {
    await lockPeriodMutations(tx);
    const currentPeriod = await tx.setting.findUnique({ where: { id: 1 }, select: { periodStartedAt: true } });
    if (!currentPeriod || currentPeriod.periodStartedAt.getTime() !== startingPeriod.periodStartedAt.getTime()) {
      throw new HttpError(409, 'Periode berubah saat penghapusan diproses. Muat ulang halaman anggota.');
    }
    const m = await tx.member.findUnique({ where: { id }, select: { receiptKey: true } });
    if (!m) throw new HttpError(404, 'Anggota tidak ditemukan.');
    await tx.member.delete({ where: { id } });
    return m.receiptKey;
  });
  await deleteObject(receiptKey);
  return json({ ok: true });
});
