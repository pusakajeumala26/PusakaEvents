import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { assertSameOrigin, HttpError, json, route } from '@/lib/http';
import { deleteObject } from '@/lib/storage';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

/** Hapus anggota beserta struknya (admin). */
export const DELETE = route<Ctx>(async (req, ctx) => {
  assertSameOrigin(req);
  await requireAdmin();
  const { id } = await ctx.params;
  const m = await db.member.findUnique({ where: { id }, select: { receiptKey: true } });
  if (!m) throw new HttpError(404, 'Anggota tidak ditemukan.');
  await db.member.delete({ where: { id } });
  await deleteObject(m.receiptKey);
  return json({ ok: true });
});
