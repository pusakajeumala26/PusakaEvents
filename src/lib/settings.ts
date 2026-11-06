import { cache } from 'react';
import type { Setting } from '@prisma/client';
import { db } from './db';
import { findOrCreateSettings } from './settings-bootstrap';

const fallbackSettings: Setting & { unavailable?: true } = {
  id: 1,
  letingName: 'Pusaka Jeumala',
  amount: 10000,
  target: 36,
  deadline: null,
  registrationOpen: true,
  bankName: 'BSI',
  accountNumber: '7366090325',
  accountName: 'Raisya Zumara',
  adminPasswordHash: null,
  adminPwVersion: 0,
  periodName: 'Periode 1',
  periodStartedAt: new Date(0),
};

/** Baca (atau buat) baris pengaturan tunggal. Tanpa cache: untuk route handler & auth. */
export const loadSettings = async (): Promise<Setting & { unavailable?: true }> => {
  try {
    return await findOrCreateSettings({
      findUnique: () => db.setting.findUnique({ where: { id: 1 } }),
      create: () => db.setting.create({ data: { id: 1 } }),
    });
  } catch (error) {
    const cause = error as { name?: string; code?: string };
    // Hindari mencatat message/error mentah: driver dapat menyertakan URL koneksi.
    if (cause.code !== 'P2002') {
      console.error('[settings] Database settings unavailable', {
        name: cause.name ?? 'UnknownError',
        code: cause.code ?? 'UNKNOWN',
      });
    }
    return { ...fallbackSettings, unavailable: true };
  }
};

/** Ensures the singleton exists and propagates database errors to write endpoints. */
export const ensureSettings = () => findOrCreateSettings({
  findUnique: () => db.setting.findUnique({ where: { id: 1 } }),
  create: () => db.setting.create({ data: { id: 1 } }),
});

/** Versi ber-cache per request untuk Server Components. */
export const getSettings = cache(loadSettings);
