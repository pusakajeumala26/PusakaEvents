import { z } from 'zod';
import { requireSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { assertSameOrigin, HttpError, json, route } from '@/lib/http';
import { deleteReceiptPrefix } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Context = { params: Promise<{ id: string }> };

export const POST = route<Context>(async (req, context) => {
  assertSameOrigin(req);
  await requireSuperAdmin();
  const { id } = z.object({ id: z.string().uuid() }).parse(await context.params);
  const period = await db.period.findUnique({ where: { id } });
  if (!period) throw new HttpError(404, 'Riwayat periode tidak ditemukan.');
  const result = await deleteReceiptPrefix();
  const cleanupStatus = result.failed ? 'PARTIAL' : 'OK';
  await db.period.update({ where: { id }, data: { cleanupStatus } });
  return json({ ok: result.failed === 0, cleanup: result, cleanupStatus });
});
