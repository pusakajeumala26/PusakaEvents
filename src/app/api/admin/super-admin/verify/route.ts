import { createSuperAdminSession, isSuperAdminConfigured, verifySuperAdminPassword } from '@/lib/auth';
import { assertSameOrigin, clientIp, HttpError, json, rateLimit, readJson, route } from '@/lib/http';

export const runtime = 'nodejs';

/** Buka kunci Super Admin. Tidak memerlukan login admin; password-nya terpisah. */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req);
  rateLimit(`super-admin:${clientIp(req)}`, 5, 15 * 60_000);
  if (!isSuperAdminConfigured()) throw new HttpError(503, 'Super admin belum dikonfigurasi (SUPER_ADMIN_PASSWORD).');

  const body = await readJson<{ password?: unknown }>(req);
  const password = typeof body.password === 'string' ? body.password : '';
  if (!verifySuperAdminPassword(password)) throw new HttpError(401, 'Password super admin salah.');

  await createSuperAdminSession();
  return json({ ok: true });
});
