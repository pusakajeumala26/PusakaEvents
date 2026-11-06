import { HomeView } from '@/components/HomeView';
import { getSelf, isAdmin } from '@/lib/auth';
import { getStats, listMembers, toPayInfo, toSelfView } from '@/lib/members';
import { getSettings } from '@/lib/settings';

export default async function HomePage({ searchParams }: { searchParams: Promise<{ upload?: string }> }) {
  const [settings, admin, self, params] = await Promise.all([getSettings(), isAdmin(), getSelf(), searchParams]);
  const [members, stats] = await Promise.all([listMembers(admin), getStats(settings)]);
  return (
    <HomeView
      members={members}
      stats={stats}
      pay={toPayInfo(settings)}
      self={self ? toSelfView(self) : null}
      admin={admin}
      registrationOpen={settings.registrationOpen}
      letingName={settings.letingName}
      autoUpload={params.upload === '1'}
    />
  );
}
