import { createAdminSession, hashPassword, requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { assertSameOrigin, json, readJson, route } from '@/lib/http';
import { adminPassword } from '@/lib/validation';
import { ensureSettings } from '@/lib/settings';

export const runtime = 'nodejs';

/** Ganti password admin. Semua sesi lama (termasuk di perangkat lain) langsung tidak berlaku. */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req);
  await requireAdmin();
  const body = await readJson<{ newPassword?: unknown }>(req);
  const newPassword = adminPassword.parse(typeof body.newPassword === 'string' ? body.newPassword : '');

  await ensureSettings();
  await db.setting.update({
    where: { id: 1 },
    data: { adminPasswordHash: await hashPassword(newPassword), adminPwVersion: { increment: 1 } },
  });
  await createAdminSession(); // sesi perangkat ini tetap masuk dengan versi baru
  return json({ ok: true });
});
