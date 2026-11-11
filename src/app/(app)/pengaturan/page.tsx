import type { Metadata } from 'next';
import { AdminGate } from '@/components/AdminGate';
import { SettingsView } from '@/components/SettingsView';
import { isAdmin } from '@/lib/auth';
import { toSettingsView } from '@/lib/members';
import { getPortfolioStatus } from '@/lib/feedback-service';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = { title: 'Pengaturan' };

export default async function PengaturanPage() {
  if (!(await isAdmin())) return <AdminGate title="Pengaturan" />;
  const [settings, portfolio] = await Promise.all([getSettings(), getPortfolioStatus()]);
  return <SettingsView initial={toSettingsView(settings)} portfolio={portfolio} />;
}
