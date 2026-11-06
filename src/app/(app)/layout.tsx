import { AppShell } from '@/components/AppShell';
import { isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [settings, admin] = await Promise.all([getSettings(), isAdmin()]);
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
    <AppShell letingName={settings.letingName} admin={admin} pending={pending}>
      {children}
    </AppShell>
  );
}
