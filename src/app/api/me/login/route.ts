import { comparePassword, createMemberSession, hashPassword } from '@/lib/auth';
import { db } from '@/lib/db';
import { assertSameOrigin, clientIp, HttpError, json, rateLimit, readJson, route } from '@/lib/http';
import { countryField, memberPassword, phoneField } from '@/lib/validation';

export const runtime = 'nodejs';

const BAD = 'Nomor atau password salah. Coba lagi.';

/**
 * Anggota membuka datanya dengan nomor HP + password.
 * Anggota hasil impor admin belum punya password: balasan { needsPassword: true } meminta klien
 * mengirim ulang dengan newPassword untuk membuatnya.
 */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req);
  const body = await readJson<{ countryCode?: unknown; phone?: unknown; password?: unknown; newPassword?: unknown }>(req);
  const countryCode = countryField.parse(body.countryCode);
  const phone = phoneField.parse(typeof body.phone === 'string' ? body.phone : '');
  rateLimit(`mlogin:${clientIp(req)}`, 20, 10 * 60_000);
  rateLimit(`mlogin:${countryCode}${phone}`, 8, 10 * 60_000);

  const member = await db.member.findUnique({ where: { countryCode_phone: { countryCode, phone } } });
  if (!member) throw new HttpError(401, BAD);

  if (!member.passwordHash) {
    if (typeof body.newPassword !== 'string') return json({ needsPassword: true });
    const pw = memberPassword.parse(body.newPassword);
    await db.member.update({ where: { id: member.id }, data: { passwordHash: await hashPassword(pw) } });
    await createMemberSession(member.id);
    return json({ ok: true });
  }

  const password = typeof body.password === 'string' ? body.password : '';
  if (!password || !(await comparePassword(password, member.passwordHash))) throw new HttpError(401, BAD);
  await createMemberSession(member.id);
  return json({ ok: true });
});
