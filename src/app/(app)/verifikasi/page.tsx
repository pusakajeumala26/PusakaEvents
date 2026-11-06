import type { Metadata } from 'next';
import { AdminGate } from '@/components/AdminGate';
import { VerifyView } from '@/components/VerifyView';
import { isAdmin } from '@/lib/auth';
import { listMembers } from '@/lib/members';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = { title: 'Verifikasi Struk' };

export default async function VerifikasiPage() {
  if (!(await isAdmin())) return <AdminGate title="Verifikasi struk" />;
  const [members, settings] = await Promise.all([listMembers(true), getSettings()]);
  return <VerifyView members={members} amount={settings.amount} />;
}
