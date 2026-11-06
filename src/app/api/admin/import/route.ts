import { randomUUID } from 'node:crypto';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { assertSameOrigin, HttpError, json, readJson, route } from '@/lib/http';
import { importRow } from '@/lib/validation';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_ROWS = 500;

type Item = { row: number; name: string; state: 'valid' | 'duplicate' | 'fix'; message?: string };

/**
 * Impor anggota dari Excel/JSON/CSV (sudah di-parse di browser menjadi array objek).
 * commit=false: hanya pratinjau (valid / duplikat / perlu diperbaiki).
 * commit=true: simpan baris valid sebagai anggota berstatus "Belum input" (tanpa password).
 */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req);
  await requireAdmin();
  const body = await readJson<{ rows?: unknown; commit?: unknown }>(req);
  if (!Array.isArray(body.rows) || body.rows.length === 0) throw new HttpError(422, 'File tidak berisi baris data.');
  if (body.rows.length > MAX_ROWS) throw new HttpError(422, `Maksimal ${MAX_ROWS} baris per impor.`);

  const existing = await db.member.findMany({ select: { countryCode: true, phone: true } });
  const seen = new Set(existing.map((m) => `${m.countryCode}|${m.phone}`));

  const items: Item[] = [];
  const toCreate: { id: string; name: string; countryCode: string; phone: string; subject: string; gender: 'L' | 'P' }[] = [];

  body.rows.forEach((raw, i) => {
    const parsed = importRow.safeParse(raw);
    const name = typeof (raw as { name?: unknown })?.name === 'string' ? String((raw as { name: string }).name) : `Baris ${i + 1}`;
    if (!parsed.success) {
      items.push({ row: i + 1, name, state: 'fix', message: parsed.error.issues[0]?.message ?? 'Data tidak valid.' });
      return;
    }
    const r = parsed.data;
    const k = `${r.countryCode}|${r.phone}`;
    if (seen.has(k)) {
      items.push({ row: i + 1, name: r.name, state: 'duplicate', message: 'Nomor sudah terdaftar.' });
      return;
    }
    seen.add(k);
    items.push({ row: i + 1, name: r.name, state: 'valid' });
    toCreate.push({ id: randomUUID(), ...r });
  });

  const summary = {
    valid: items.filter((x) => x.state === 'valid').length,
    duplicate: items.filter((x) => x.state === 'duplicate').length,
    fix: items.filter((x) => x.state === 'fix').length,
  };

  if (body.commit === true && toCreate.length) {
    await db.$transaction([
      db.member.createMany({ data: toCreate.map((m) => ({ ...m, status: 'BELUM' as const })) }),
      db.memberEvent.createMany({ data: toCreate.map((m) => ({ memberId: m.id, type: 'IMPOR' as const, note: 'Ditambahkan admin lewat impor' })) }),
    ]);
  }
  return json({ ...summary, imported: body.commit === true ? toCreate.length : 0, items: items.slice(0, 200) });
});
