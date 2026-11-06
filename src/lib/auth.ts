import { timingSafeEqual } from 'node:crypto';
import { cache } from 'react';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { jwtVerify, SignJWT } from 'jose';
import { db } from './db';
import { requireEnv } from './env';
import { HttpError } from './http';
import { loadSettings } from './settings';

export const ADMIN_COOKIE = 'pe_admin';
export const MEMBER_COOKIE = 'pe_member';
const ADMIN_MAX_AGE_S = 60 * 60 * 12;
const MEMBER_MAX_AGE_S = 60 * 60 * 24 * 14;

const secretKey = () => new TextEncoder().encode(requireEnv('SESSION_SECRET'));

const cookieOpts = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge,
});

/* ------------------------------ admin ------------------------------ */

/**
 * Password admin: hash di database (setelah diganti lewat Pengaturan),
 * atau ADMIN_PASSWORD dari env selama belum pernah diganti.
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  const s = await loadSettings();
  if (s.adminPasswordHash) return bcrypt.compare(password, s.adminPasswordHash);
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createAdminSession() {
  const { adminPwVersion } = await loadSettings();
  const token = await new SignJWT({ role: 'admin', pv: adminPwVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_MAX_AGE_S}s`)
    .sign(secretKey());
  (await cookies()).set(ADMIN_COOKIE, token, cookieOpts(ADMIN_MAX_AGE_S));
}

export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

async function checkAdminCookie(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    if (payload.role !== 'admin') return false;
    const { adminPwVersion } = await loadSettings();
    return payload.pv === adminPwVersion;
  } catch {
    return false;
  }
}

/** Untuk Server Components (satu pengecekan per request). */
export const isAdmin = cache(checkAdminCookie);

/** Untuk route handler (tanpa cache). */
export const checkAdmin = checkAdminCookie;

/** Untuk route handler: lempar 401 jika bukan admin. */
export async function requireAdmin() {
  if (!(await checkAdminCookie())) throw new HttpError(401, 'Sesi admin berakhir. Masuk lagi sebagai admin.');
}

/* ------------------------------ anggota ------------------------------ */

export async function createMemberSession(memberId: string) {
  const token = await new SignJWT({ role: 'member' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(memberId)
    .setIssuedAt()
    .setExpirationTime(`${MEMBER_MAX_AGE_S}s`)
    .sign(secretKey());
  (await cookies()).set(MEMBER_COOKIE, token, cookieOpts(MEMBER_MAX_AGE_S));
}

export async function clearMemberSession() {
  (await cookies()).delete(MEMBER_COOKIE);
}

/** ID anggota dari cookie sesi (tanpa query DB), atau null. */
export async function memberIdFromCookie(): Promise<string | null> {
  const token = (await cookies()).get(MEMBER_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    return payload.role === 'member' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

async function loadSelf() {
  const id = await memberIdFromCookie();
  return id ? db.member.findUnique({ where: { id } }) : null;
}

/** Anggota yang sedang masuk (satu query per request di Server Components). */
export const getSelf = cache(loadSelf);

export async function requireSelf() {
  const me = await loadSelf();
  if (!me) throw new HttpError(401, 'Sesi berakhir. Buka data lagi dengan nomor HP dan password.');
  return me;
}

/* ------------------------------ umum ------------------------------ */

export const hashPassword = (password: string) => bcrypt.hash(password, 10);
export const comparePassword = (password: string, hash: string) => bcrypt.compare(password, hash);
