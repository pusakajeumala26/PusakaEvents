import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { assertSameOrigin, json, readJson, route } from '@/lib/http';
import { deadlineFromInput } from '@/lib/members';
import { ensureSettings } from '@/lib/settings';
import { settingsPatch } from '@/lib/validation';

export const runtime = 'nodejs';

export const PATCH = route(async (req: Request) => {
  assertSameOrigin(req);
  await requireAdmin();
  const { deadline, accountNumber, ...rest } = settingsPatch.parse(await readJson(req));

  const data = {
    ...rest,
    ...(accountNumber !== undefined ? { accountNumber: accountNumber.replace(/[\s-]/g, '') } : {}),
    ...(deadline !== undefined ? { deadline: deadline ? deadlineFromInput(deadline) : null } : {}),
  };
  await ensureSettings();
  await db.setting.update({ where: { id: 1 }, data });
  return json({ ok: true });
});
