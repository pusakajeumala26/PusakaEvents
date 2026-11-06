import type { Metadata } from 'next';
import { AdminGate } from '@/components/AdminGate';
import { SettingsView } from '@/components/SettingsView';
import { isAdmin } from '@/lib/auth';
import { toSettingsView } from '@/lib/members';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = { title: 'Pengaturan & Ekspor' };

export default async function PengaturanPage() {
  if (!(await isAdmin())) return <AdminGate title="Pengaturan & ekspor" />;
  return <SettingsView initial={toSettingsView(await getSettings())} />;
}
