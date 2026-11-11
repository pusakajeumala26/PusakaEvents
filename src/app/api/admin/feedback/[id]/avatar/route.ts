import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { HttpError, route } from '@/lib/http';
import { getReceipt } from '@/lib/storage';

export const runtime = 'nodejs';

export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const row = await db.feedback.findUnique({ where: { id }, select: { avatarKey: true } });
  if (!row?.avatarKey) throw new HttpError(404, 'Foto tidak ada.');
  const object = await getReceipt(row.avatarKey);
  if (!object) throw new HttpError(404, 'Foto tidak ada.');
  return new Response(Buffer.from(object.body), {
    headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff' },
  });
});
