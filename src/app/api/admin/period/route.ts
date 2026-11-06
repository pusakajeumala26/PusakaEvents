import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { HttpError, json, route } from '@/lib/http';
import { listReceiptObjects } from '@/lib/storage';

export const runtime = 'nodejs';

export const GET = route(async () => {
  await requireAdmin();
  const [setting, members, periods] = await Promise.all([
    db.setting.findUnique({ where: { id: 1 }, select: { periodName: true, periodStartedAt: true, amount: true, target: true } }),
    db.member.findMany({ select: { status: true, receiptKey: true } }),
    db.period.findMany({ orderBy: { closedAt: 'desc' } }),
  ]);
  if (!setting) throw new HttpError(503, 'Pengaturan periode belum tersedia.');
  let objects: Awaited<ReturnType<typeof listReceiptObjects>> = [];
  let storageAvailable = true;
  try { objects = await listReceiptObjects(); }
  catch (error) {
    const cause = error as { name?: string; code?: string };
    console.error('[period] Storage preview unavailable', { name: cause.name ?? 'UnknownError', code: cause.code ?? 'UNKNOWN' });
    storageAvailable = false;
  }
  const counts = { total: members.length, TERVERIFIKASI: 0, MENUNGGU: 0, DITOLAK: 0, BELUM: 0 };
  for (const member of members) counts[member.status] += 1;
  const databaseReceiptCount = members.filter((member) => member.receiptKey).length;
  return json({
    current: {
      name: setting.periodName, startedAt: setting.periodStartedAt,
      amount: setting.amount, targetCount: setting.target,
      counts, verifiedTotal: counts.TERVERIFIKASI * setting.amount,
      databaseReceiptCount, receiptCount: objects.length,
      receiptSize: objects.reduce((total, item) => total + item.size, 0),
      storageAvailable,
      storageConsistent: storageAvailable && databaseReceiptCount === objects.length,
    },
    history: periods,
  });
});
