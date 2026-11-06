'use client';

/** Baca file impor (xlsx / csv / json) di browser menjadi array baris untuk /api/admin/import. */

type Row = Record<string, string>;

const KEYS: Record<string, string> = {
  nama: 'name', name: 'name', 'nama lengkap': 'name',
  no_hp: 'phone', nohp: 'phone', 'no hp': 'phone', 'no. hp': 'phone', hp: 'phone', phone: 'phone', wa: 'phone', 'no wa': 'phone',
  kode_negara: 'countryCode', kode: 'countryCode', negara: 'countryCode', countrycode: 'countryCode', country: 'countryCode',
  gender: 'gender', jk: 'gender', 'jenis kelamin': 'gender',
  subjek: 'subject', subject: 'subject', deskripsi: 'subject',
};

function normGender(v: string): string {
  const t = v.trim().toLowerCase();
  if (['l', 'laki-laki', 'laki laki', 'pria', 'male', 'm'].includes(t)) return 'L';
  if (['p', 'perempuan', 'wanita', 'female', 'f'].includes(t)) return 'P';
  return v.trim();
}

function normCountry(v: string): string {
  const t = v.trim();
  if (!t) return '+62';
  return t.startsWith('+') ? t : `+${t.replace(/\D/g, '')}`;
}

function normalizeRow(raw: Record<string, unknown>): Row {
  const out: Row = { name: '', phone: '', countryCode: '', gender: '', subject: '' };
  for (const [k, v] of Object.entries(raw)) {
    const key = KEYS[k.trim().toLowerCase()];
    if (key) out[key] = v == null ? '' : String(v);
  }
  out.gender = normGender(out.gender);
  out.countryCode = normCountry(out.countryCode);
  return out;
}

function parseCsv(text: string): Record<string, string>[] {
  const src = text.replace(/^﻿/, '');
  const delim = (src.split(/\r?\n/, 1)[0].match(/;/g)?.length ?? 0) > (src.split(/\r?\n/, 1)[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let cur: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { cur.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      cur.push(cell); cell = '';
      if (cur.some((c) => c.trim())) rows.push(cur);
      cur = [];
    } else cell += ch;
  }
  cur.push(cell);
  if (cur.some((c) => c.trim())) rows.push(cur);
  const [head, ...body] = rows;
  if (!head) return [];
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

export async function parseImportFile(file: File): Promise<Row[]> {
  const name = file.name.toLowerCase();
  let raw: Record<string, unknown>[];
  if (name.endsWith('.json')) {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data)) throw new Error('File JSON harus berisi array objek anggota.');
    raw = data;
  } else if (name.endsWith('.csv')) {
    raw = parseCsv(await file.text());
  } else if (name.endsWith('.xlsx')) {
    const { default: readXlsx } = await import('read-excel-file');
    const [head, ...body] = (await readXlsx(file)) as unknown[][];
    if (!head) throw new Error('File Excel kosong.');
    raw = body.map((r) => Object.fromEntries(head.map((h, i) => [String(h ?? ''), r[i] ?? ''])));
  } else {
    throw new Error('Format file tidak didukung. Gunakan .xlsx, .csv, atau .json.');
  }
  const rows = raw.filter((r) => r && Object.values(r).some((v) => String(v ?? '').trim())).map(normalizeRow);
  if (rows.length === 0) throw new Error('File tidak berisi baris data.');
  return rows;
}
