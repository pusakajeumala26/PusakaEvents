import { HomeView } from '@/components/HomeView';
import { getSelf, isAdmin } from '@/lib/auth';
import { getStats, listMembers, toPayInfo, toSelfView } from '@/lib/members';
import { getSettings } from '@/lib/settings';

export default async function HomePage({ searchParams }: { searchParams: Promise<{ upload?: string }> }) {
  const [settings, admin, params] = await Promise.all([getSettings(), isAdmin(), searchParams]);
  let members = [] as Awaited<ReturnType<typeof listMembers>>;
  let stats: Awaited<ReturnType<typeof getStats>> = {
    counts: { total: 0, TERVERIFIKASI: 0, MENUNGGU: 0, DITOLAK: 0, BELUM: 0 },
    target: settings.target,
    uploaded: 0,
    uploadedPct: 0,
    days: [],
    peakLabel: '-',
    peakN: 0,
  };
  let dataUnavailable = settings.unavailable === true;
  let self = null as Awaited<ReturnType<typeof getSelf>>;
  try {
    [members, stats, self] = await Promise.all([listMembers(admin, 5), getStats(settings), getSelf()]);
  } catch (error) {
    const cause = error as { name?: string; code?: string };
    console.error('[home] Database data unavailable', { name: cause.name ?? 'UnknownError', code: cause.code ?? 'UNKNOWN' });
    dataUnavailable = true;
  }
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
      dataUnavailable={dataUnavailable}
    />
  );
}
