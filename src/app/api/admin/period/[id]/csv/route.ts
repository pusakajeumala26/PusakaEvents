import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { HttpError, route } from '@/lib/http';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
const cell = (value: string | number) => {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

export const GET = route<Context>(async (_req, context) => {
  await requireAdmin();
  const { id } = z.object({ id: z.string().uuid() }).parse(await context.params);
  const period = await db.period.findUnique({ where: { id } });
  if (!period) throw new HttpError(404, 'Riwayat periode tidak ditemukan.');
  const rows = [
    ['Nama periode', 'Tanggal mulai', 'Tanggal tutup', 'Terverifikasi', 'Menunggu', 'Ditolak', 'Belum input', 'Jumlah anggota', 'Kas terverifikasi', 'Jumlah struk'],
    [period.name, period.startedAt.toISOString(), period.closedAt.toISOString(), period.verifiedCount, period.pendingCount, period.rejectedCount, period.unpaidCount, period.totalMembers, period.verifiedTotal, period.receiptCount],
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(cell).join(',')).join('\r\n')}\r\n`;
  return new Response(csv, { headers: {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${period.name.replace(/[^a-z0-9-]/gi, '-')}-ringkasan.csv"`,
    'Cache-Control': 'private, no-store',
  } });
});
