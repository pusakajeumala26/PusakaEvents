import { checkAdmin, memberIdFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';
import { HttpError, route } from '@/lib/http';
import { getReceipt } from '@/lib/storage';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

/** Struk hanya boleh dilihat admin atau pemilik struk itu sendiri. */
export const GET = route<Ctx>(async (req, ctx) => {
  const { id } = await ctx.params;
  const [admin, selfId] = await Promise.all([checkAdmin(), memberIdFromCookie()]);
  if (!admin && selfId !== id) throw new HttpError(401, 'Tidak diizinkan melihat struk ini.');

  const m = await db.member.findUnique({ where: { id }, select: { receiptKey: true } });
  if (!m?.receiptKey) throw new HttpError(404, 'Struk belum ada.');
  const obj = await getReceipt(m.receiptKey);
  if (!obj) throw new HttpError(404, 'File struk tidak ditemukan di storage.');

  const url = new URL(req.url);
  const headers: Record<string, string> = {
    'Content-Type': obj.contentType,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  };
  if (url.searchParams.get('download') === '1') headers['Content-Disposition'] = `attachment; filename="struk-${id.slice(0, 8)}.webp"`;
  return new Response(Buffer.from(obj.body), { headers });
});
