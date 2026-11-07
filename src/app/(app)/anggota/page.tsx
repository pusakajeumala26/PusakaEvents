import { MemberDirectory } from '@/components/MemberDirectory';
import { isAdmin } from '@/lib/auth';
import { listMembers } from '@/lib/members';

export default async function MemberDirectoryPage() {
  const admin = await isAdmin();
  try {
    const members = await listMembers(admin);
    return <MemberDirectory members={members} admin={admin} />;
  } catch (error) {
    const cause = error as { name?: string; code?: string };
    console.error('[members] Directory data unavailable', { name: cause.name ?? 'UnknownError', code: cause.code ?? 'UNKNOWN' });
    return <MemberDirectory members={[]} admin={admin} unavailable />;
  }
}
