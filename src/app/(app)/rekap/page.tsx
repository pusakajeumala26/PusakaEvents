import type { Metadata } from 'next';
import { AdminGate } from '@/components/AdminGate';
import { RekapView } from '@/components/RekapView';
import { isAdmin } from '@/lib/auth';
import { getCounts, getRekap, listMembers, toPayInfo } from '@/lib/members';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = { title: 'Rekap Kas' };

export default async function RekapPage() {
  if (!(await isAdmin())) return <AdminGate title="Rekap kas" />;
  const [settings, counts, members] = await Promise.all([getSettings(), getCounts(), listMembers(true)]);
  const unpaid = members.filter((m) => m.status === 'BELUM' || m.status === 'DITOLAK');
  return <RekapView rekap={getRekap(settings, counts)} unpaid={unpaid} pay={toPayInfo(settings)} />;
}
