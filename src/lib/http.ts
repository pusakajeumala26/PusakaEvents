import { ZodError } from 'zod';

export class HttpError extends Error {
  public status: number;
  public code?: string;
  public retryAfterSeconds?: number;

  constructor(
    status: number,
    message: string,
    code?: string,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export const json = (body: unknown, status = 200, headers?: HeadersInit) => Response.json(body, { status, headers });

/** Pembungkus route handler: ubah error jadi JSON { error } dengan status yang tepat. */
export function route<C = unknown>(fn: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) {
        const headers = e.retryAfterSeconds ? { 'Retry-After': String(e.retryAfterSeconds) } : undefined;
        return json({ error: e.message, ...(e.code ? { code: e.code } : {}) }, e.status, headers);
      }
      if (e instanceof ZodError) return json({ error: e.issues[0]?.message ?? 'Data tidak valid.' }, 422);
      const cause = e as { name?: string; code?: string };
      console.error('[api] request failed', { name: cause.name ?? 'UnknownError', code: cause.code ?? 'UNKNOWN' });
      return json({ error: 'Terjadi kesalahan di server. Coba lagi sebentar.' }, 500);
    }
  };
}

/** Tolak request lintas-situs yang membawa cookie (CSRF) untuk method yang mengubah data. */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  let originHost = '';
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, 'Origin tidak valid.');
  }
  if (host && originHost !== host) throw new HttpError(403, 'Permintaan ditolak (origin berbeda).');
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

type Bucket = { n: number; reset: number };
const buckets = new Map<string, Bucket>();

/**
 * Pembatas laju sederhana di memori. Di serverless tiap instance punya hitungan sendiri,
 * jadi ini hanya lapisan pelan-pelan; untuk perlindungan ketat pakai Upstash/Vercel Firewall.
 */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
    return;
  }
  b.n += 1;
  if (b.n > limit) {
    const wait = Math.ceil((b.reset - now) / 60000);
    const retryAfterSeconds = Math.max(1, Math.ceil((b.reset - now) / 1000));
    throw new HttpError(429, `Terlalu banyak percobaan. Coba lagi sekitar ${wait} menit lagi.`, 'RATE_LIMITED', retryAfterSeconds);
  }
}

export const formString = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v : '');

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, 'Body permintaan harus berupa JSON.');
  }
}
