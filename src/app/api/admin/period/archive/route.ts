import { requireSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { HttpError, json, route } from '@/lib/http';
import { listReceiptObjects } from '@/lib/storage';

export const runtime = 'nodejs';

export const GET = route(async () => {
  await requireSuperAdmin();
  const [setting, members, objects] = await Promise.all([
    db.setting.findUnique({ where: { id: 1 }, select: { periodName: true, periodStartedAt: true, amount: true, target: true, deadline: true } }),
    db.member.findMany({ orderBy: { createdAt: 'asc' }, select: {
      id: true, name: true, countryCode: true, phone: true, subject: true, gender: true,
      status: true, rejectReason: true, receiptAt: true, reviewedAt: true, createdAt: true,
      receiptKey: true,
    } }),
    listReceiptObjects(),
  ]);
  if (!setting) throw new HttpError(503, 'Pengaturan periode belum tersedia.');
  const receiptCount = members.filter((member) => member.receiptKey).length;
  const safeMembers = members.map(({ receiptKey, ...member }) => ({ ...member, hasReceipt: !!receiptKey }));
  return json({ setting, receiptCount, storageReceiptCount: objects.length, receiptSize: objects.reduce((sum, object) => sum + object.size, 0), members: safeMembers });
});
