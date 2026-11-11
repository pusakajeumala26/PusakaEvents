import bcrypt from 'bcryptjs';
import { assertSameOrigin, clientIp, HttpError, json, rateLimit, readJson, route } from '@/lib/http';
import { db } from '@/lib/db';
import { deadlineFromInput } from '@/lib/members';
import { requireSuperAdmin } from '@/lib/auth';
import { deleteReceiptPrefix, listReceiptObjects } from '@/lib/storage';
import { closePeriodWorkflow } from '@/lib/period-close';
import { periodCloseBody } from '@/lib/validation';
import { lockPeriodMutations } from '@/lib/period-lock';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = route(async (req: Request) => {
  assertSameOrigin(req);
  await requireSuperAdmin();
  rateLimit(`period-close:${clientIp(req)}`, 4, 15 * 60_000);
  const input = periodCloseBody.parse(await readJson(req));

  try {
    const result = await closePeriodWorkflow(input, {
      passwordMatches: async (password) => {
        const setting = await db.setting.findUnique({ where: { id: 1 }, select: { adminPasswordHash: true } });
        return !!setting?.adminPasswordHash && await bcrypt.compare(password, setting.adminPasswordHash);
      },
      countReceipts: async () => (await listReceiptObjects()).length,
      commit: async (closeInput, receiptCount) => db.$transaction(async (tx) => {
        await lockPeriodMutations(tx);
        const setting = await tx.setting.findUnique({ where: { id: 1 } });
        if (!setting || setting.periodName !== closeInput.confirmName || (closeInput.confirmStartedAt && setting.periodStartedAt.toISOString() !== closeInput.confirmStartedAt)) {
          throw new HttpError(409, 'Periode aktif sudah berubah. Muat ulang pengaturan dan buat arsip baru.', 'PERIOD_CHANGED');
        }
        await tx.setting.update({ where: { id: 1 }, data: { registrationOpen: false } });
        const dbReceiptCount = await tx.member.count({ where: { receiptKey: { not: null } } });
        if (dbReceiptCount !== receiptCount) {
          throw new HttpError(409, 'Jumlah struk tidak cocok dengan file di storage. Arsipkan ulang dan periksa penyimpanan.', 'RECEIPT_COUNT_MISMATCH');
        }
        const grouped = await tx.member.groupBy({ by: ['status'], _count: { _all: true } });
        const counts = { totalMembers: 0, verifiedCount: 0, pendingCount: 0, rejectedCount: 0, unpaidCount: 0 };
        for (const group of grouped) {
          counts.totalMembers += group._count._all;
          if (group.status === 'TERVERIFIKASI') counts.verifiedCount = group._count._all;
          if (group.status === 'MENUNGGU') counts.pendingCount = group._count._all;
          if (group.status === 'DITOLAK') counts.rejectedCount = group._count._all;
          if (group.status === 'BELUM') counts.unpaidCount = group._count._all;
        }
        if (closeInput.archivedMemberCount !== undefined && counts.totalMembers !== closeInput.archivedMemberCount) {
          throw new HttpError(409, 'Jumlah anggota berubah sejak arsip dibuat. Unduh ulang arsip sebelum menutup periode.', 'MEMBER_COUNT_CHANGED');
        }
        const now = new Date();
        const period = await tx.period.create({ data: {
          name: setting.periodName, amount: setting.amount, targetCount: setting.target,
          startedAt: setting.periodStartedAt, closedAt: now,
          ...counts, verifiedTotal: counts.verifiedCount * setting.amount,
          receiptCount, cleanupStatus: 'PARTIAL',
        } });
        await tx.member.updateMany({ data: {
          status: 'BELUM', receiptKey: null, receiptAt: null, reviewedAt: null, rejectReason: null,
        } });
        await tx.memberEvent.deleteMany({});
        const newPeriod = closeInput.newPeriod;
        await tx.setting.update({ where: { id: 1 }, data: {
          periodName: newPeriod.name, periodStartedAt: now,
          amount: newPeriod.amount, target: newPeriod.targetCount,
          deadline: newPeriod.deadline ? deadlineFromInput(newPeriod.deadline) : null,
          registrationOpen: false,
        } });
        return period;
      }),
      cleanup: async () => {
        try {
          const result = await deleteReceiptPrefix();
          return { deleted: result.deleted, failed: result.failed };
        } catch (error) {
          const cause = error as { name?: string; code?: string };
          console.error('[period] Receipt cleanup could not list or delete objects', { name: cause.name ?? 'UnknownError', code: cause.code ?? 'UNKNOWN' });
          return { deleted: 0, failed: 1 };
        }
      },
      markPartial: async (id) => {
        await db.period.update({ where: { id }, data: { cleanupStatus: 'PARTIAL' } });
      },
      markClean: async (id) => {
        await db.period.update({ where: { id }, data: { cleanupStatus: 'OK' } });
      },
    });
    return json({ ok: true, period: { ...result.period, cleanupStatus: result.cleanupStatus }, cleanup: result.cleanup, cleanupStatus: result.cleanupStatus });
  } catch (error) {
    const cause = error as { code?: string; message?: string };
    if (cause.code === 'PASSWORD_INVALID') throw new HttpError(401, 'Password admin salah.', 'PASSWORD_INVALID');
    if (cause.code === 'RECEIPT_COUNT_CHANGED') throw new HttpError(409, cause.message ?? 'Jumlah struk berubah. Unduh ulang arsip.', 'RECEIPT_COUNT_CHANGED');
    if (error instanceof HttpError) throw error;
    throw error;
  }
});
