import { clearMemberSession } from '@/lib/auth';
import { assertSameOrigin, json, route } from '@/lib/http';

export const runtime = 'nodejs';

export const POST = route(async (req: Request) => {
  assertSameOrigin(req);
  await clearMemberSession();
  return json({ ok: true });
});
