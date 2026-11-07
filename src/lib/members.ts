import type { Member, MemberEvent, Setting } from '@prisma/client';
import { APP_TZ_OFFSET_MS } from './constants';
import { db } from './db';
import { fmtPhone, maskPhone } from './format';
import type { Counts, EventView, MemberView, PayInfo, Rekap, SelfView, SettingsView, Stats } from './types';

const DAY_MS = 86_400_000;
const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const DAY_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function toView(m: Member, admin: boolean): MemberView {
  const view: MemberView = {
    id: m.id,
    name: m.name,
    phoneDisplay: admin ? `${m.countryCode} ${fmtPhone(m.phone)}` : maskPhone(m.countryCode, m.phone),
    status: m.status,
    createdAt: m.createdAt.toISOString(),
    receiptAt: m.receiptAt?.toISOString() ?? null,
  };
  if (admin) {
    view.countryCode = m.countryCode;
    view.phone = m.phone;
    view.subject = m.subject;
    view.gender = m.gender;
    view.rejectReason = m.rejectReason;
    view.hasReceipt = !!m.receiptKey;
    view.hasPassword = !!m.passwordHash;
  }
  return view;
}

export const toSelfView = (m: Member): SelfView => ({
  id: m.id,
  name: m.name,
  phoneDisplay: maskPhone(m.countryCode, m.phone),
  status: m.status,
  rejectReason: m.status === 'DITOLAK' ? m.rejectReason : null,
  receiptAt: m.receiptAt?.toISOString() ?? null,
});

export const toEventView = (e: MemberEvent): EventView => ({
  id: e.id,
  type: e.type,
  note: e.note,
  createdAt: e.createdAt.toISOString(),
});

export async function listMembers(admin: boolean, take?: number): Promise<MemberView[]> {
  const rows = await db.member.findMany({ orderBy: { createdAt: 'desc' }, ...(take ? { take } : {}) });
  return rows.map((m) => toView(m, admin));
}

export async function getCounts(): Promise<Counts> {
  const groups = await db.member.groupBy({ by: ['status'], _count: { _all: true } });
  const c: Counts = { total: 0, TERVERIFIKASI: 0, MENUNGGU: 0, DITOLAK: 0, BELUM: 0 };
  for (const g of groups) {
    c[g.status] = g._count._all;
    c.total += g._count._all;
  }
  return c;
}

export async function getStats(settings: Setting): Promise<Stats> {
  const now = Date.now();
  const today0 = Math.floor((now + APP_TZ_OFFSET_MS) / DAY_MS) * DAY_MS - APP_TZ_OFFSET_MS; // 00:00 WIB dalam ms UTC
  const [counts, recent] = await Promise.all([
    getCounts(),
    db.member.findMany({
      where: { receiptAt: { gte: new Date(today0 - 6 * DAY_MS) } },
      select: { receiptAt: true },
    }),
  ]);
  const times = recent.flatMap((r) => (r.receiptAt ? [r.receiptAt.getTime()] : []));
  const days = Array.from({ length: 7 }, (_, i) => {
    const start = today0 - (6 - i) * DAY_MS;
    const dow = new Date(start + APP_TZ_OFFSET_MS).getUTCDay();
    return {
      label: DAY_LABELS[dow],
      full: DAY_FULL[dow],
      n: times.filter((t) => t >= start && t < start + DAY_MS).length,
      today: i === 6,
    };
  });
  const peak = days.reduce((a, b) => (b.n > a.n ? b : a), days[0]);
  const target = Math.max(1, settings.target, counts.total);
  const uploaded = counts.total - counts.BELUM;
  return {
    counts,
    target,
    uploaded,
    uploadedPct: Math.min(100, Math.round((uploaded / target) * 100)),
    days: days.map(({ label, n, today }) => ({ label, n, today })),
    peakLabel: peak.n > 0 ? peak.full : '-',
    peakN: peak.n,
  };
}

export function getRekap(settings: Setting, counts: Counts): Rekap {
  const target = Math.max(1, settings.target, counts.total);
  const amount = settings.amount;
  const goal = target * amount;
  const collected = counts.TERVERIFIKASI * amount;
  const pending = counts.MENUNGGU * amount;
  return {
    amount,
    target,
    collected,
    pending,
    goal,
    shortfall: Math.max(0, goal - collected),
    pct: Math.min(100, Math.round((collected / goal) * 100)),
    counts,
  };
}

export const toPayInfo = (s: Setting): PayInfo => ({
  bankName: s.bankName,
  accountNumber: s.accountNumber,
  accountName: s.accountName,
  amount: s.amount,
});

export function toSettingsView(s: Setting): SettingsView {
  return {
    letingName: s.letingName,
    amount: s.amount,
    target: s.target,
    deadline: s.deadline ? new Date(s.deadline.getTime() + APP_TZ_OFFSET_MS).toISOString().slice(0, 10) : '',
    registrationOpen: s.registrationOpen,
    bankName: s.bankName,
    accountNumber: s.accountNumber,
    accountName: s.accountName,
  };
}

export const deadlineFromInput = (yyyyMmDd: string) => new Date(`${yyyyMmDd}T00:00:00+07:00`);
