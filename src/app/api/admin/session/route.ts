import { getAdminSessionStatus, refreshAdminSession } from '@/lib/auth';
import { assertSameOrigin, HttpError, json, route } from '@/lib/http';

export const runtime = 'nodejs';

export const GET = route(async () => {
  const status = await getAdminSessionStatus();
  if (!status) throw new HttpError(401, 'Sesi admin berakhir. Masuk lagi sebagai admin.');
  return json(status);
});

export const POST = route(async (req: Request) => {
  assertSameOrigin(req);
  return json(await refreshAdminSession());
});
