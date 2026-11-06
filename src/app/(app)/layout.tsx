import { AppShell } from '@/components/AppShell';
import { isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [settings, admin] = await Promise.all([getSettings(), isAdmin()]);
  const pending = admin ? await db.member.count({ where: { status: 'MENUNGGU' } }) : 0;
  return (
    <AppShell letingName={settings.letingName} admin={admin} pending={pending}>
      {children}
    </AppShell>
  );
}
