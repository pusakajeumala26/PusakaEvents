import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { assertSameOrigin, json, readJson, route } from '@/lib/http';
import { deadlineFromInput } from '@/lib/members';
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
  await db.setting.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
  return json({ ok: true });
});
