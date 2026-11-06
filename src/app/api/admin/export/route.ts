import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { HttpError, route } from '@/lib/http';
import { STATUS_META } from '@/lib/types';

export const runtime = 'nodejs';

/** Hindari CSV/formula injection di Excel: awali sel berbahaya dengan apostrof. */
const cell = (v: string | number | null | undefined) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

const stamp = () => new Date().toISOString().slice(0, 10);

/**
 * GET ?format=csv | json | template   (admin).
 * csv/json: rekap semua anggota + status struk. template: contoh file untuk impor.
 */
export const GET = route(async (req: Request) => {
  await requireAdmin();
  const format = new URL(req.url).searchParams.get('format') ?? 'csv';

  if (format === 'template') {
    const csv =
      '﻿' +
      ['nama,no_hp,kode_negara,gender,subjek', 'Aulia Rahmah,81234564821,+62,P,Kas leting', 'Muhammad Rizki,81310931093,+62,L,'].join('\r\n') +
      '\r\n';
    return new Response(csv, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="templat-anggota.csv"' },
    });
  }

  const [rows, setting] = await Promise.all([
    db.member.findMany({ orderBy: { createdAt: 'asc' } }),
    db.setting.findUnique({ where: { id: 1 } }),
  ]);
  const amount = setting?.amount ?? 10000;
  const records = rows.map((m) => ({
    nama: m.name,
    kode_negara: m.countryCode,
    no_hp: m.phone,
    gender: m.gender === 'L' ? 'Laki-laki' : 'Perempuan',
    subjek: m.subject,
    status: STATUS_META[m.status].label,
    nominal_terverifikasi: m.status === 'TERVERIFIKASI' ? amount : 0,
    alasan_penolakan: m.status === 'DITOLAK' ? (m.rejectReason ?? '') : '',
    struk_diunggah: m.receiptAt?.toISOString() ?? '',
    terdaftar: m.createdAt.toISOString(),
  }));

  if (format === 'json') {
    return new Response(JSON.stringify(records, null, 2), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="rekap-kas-${stamp()}.json"` },
    });
  }
  if (format !== 'csv') throw new HttpError(400, 'Format tidak dikenal.');

  const head = Object.keys(records[0] ?? { nama: '', kode_negara: '', no_hp: '', gender: '', subjek: '', status: '', nominal_terverifikasi: '', alasan_penolakan: '', struk_diunggah: '', terdaftar: '' });
  const csv =
    '﻿' +
    [head.join(','), ...records.map((r) => head.map((h) => cell((r as Record<string, string | number>)[h])).join(','))].join('\r\n') +
    '\r\n';
  return new Response(csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="rekap-kas-${stamp()}.csv"`, 'Cache-Control': 'no-store' },
  });
});
