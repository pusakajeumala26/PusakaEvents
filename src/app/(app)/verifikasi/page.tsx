import type { Metadata } from 'next';
import { AdminGate } from '@/components/AdminGate';
import { VerifyView } from '@/components/VerifyView';
import { isAdmin } from '@/lib/auth';
import { listMembers } from '@/lib/members';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = { title: 'Verifikasi Struk' };

export default async function VerifikasiPage({ searchParams }: { searchParams: Promise<{ sesi?: string }> }) {
  if (!(await isAdmin())) {
    const params = await searchParams;
    return <AdminGate title="Verifikasi struk" message={params.sesi === 'berakhir' ? 'Sesi berakhir. Masuk lagi untuk melanjutkan.' : undefined} />;
  }
  const [members, settings] = await Promise.all([listMembers(true), getSettings()]);
  return <VerifyView members={members} amount={settings.amount} />;
}
