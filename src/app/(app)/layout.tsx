import { AppShell } from '@/components/AppShell';
import { isAdmin, isSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [settings, admin, superAdmin] = await Promise.all([getSettings(), isAdmin(), isSuperAdmin()]);
  let pending = 0;
  if (admin) {
    try {
      pending = await db.member.count({ where: { status: 'MENUNGGU' } });
    } catch (error) {
      const cause = error as { name?: string; code?: string };
      console.error('[app] Pending member count unavailable', { name: cause.name ?? 'UnknownError', code: cause.code ?? 'UNKNOWN' });
    }
  }
  return (
    <AppShell letingName={settings.letingName} admin={admin} superAdmin={superAdmin} pending={pending}>
      {children}
    </AppShell>
  );
}
