import { createHash } from 'node:crypto';
import { AVATAR_MAX_BYTES, parseFeedbackFields, type FeedbackFields } from './feedback-input.ts';
import { assertSameOrigin, clientIp, HttpError, json, rateLimit } from './http.ts';

const MAX_BODY_BYTES = AVATAR_MAX_BYTES + 64 * 1024;
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 10 * 60_000;
const UNAVAILABLE_MESSAGE = 'Masukan belum dapat disimpan saat ini. Coba lagi beberapa saat lagi.';

type FeedbackHandlerDeps = {
  /** Simpan ke database (dan foto bila ada); mengembalikan id. */
  save: (fields: FeedbackFields, avatar: FormDataEntryValue | null) => Promise<string>;
  /** Jadwalkan pengiriman setelah respons dikirim. */
  schedule: (id: string) => void;
  limit?: typeof rateLimit;
  ipForRequest?: typeof clientIp;
  logCategory?: (category: string) => void;
};

/**
 * POST multipart/form-data: name, role, roleDetail, message, rating, consent, avatar (opsional), website (honeypot).
 * Feedback disimpan lebih dulu; pengiriman ke portfolio terjadi di latar belakang lewat antrean,
 * sehingga pengunjung tidak pernah kehilangan masukan karena portfolio sedang bermasalah.
 */
export function createFeedbackHandler({
  save,
  schedule,
  limit = rateLimit,
  ipForRequest = clientIp,
  logCategory = (category) => console.info('[feedback] result', category),
}: FeedbackHandlerDeps) {
  return async (request: Request): Promise<Response> => {
    try {
      assertSameOrigin(request);
      const contentType = request.headers.get('content-type') ?? '';
      if (!/^multipart\/form-data\s*;/i.test(contentType)) throw new HttpError(415, 'Permintaan harus berupa form.');
      const lengthHeader = request.headers.get('content-length');
      if (lengthHeader && /^\d+$/.test(lengthHeader) && Number(lengthHeader) > MAX_BODY_BYTES) {
        throw new HttpError(413, 'Ukuran kiriman terlalu besar (foto maksimal 2 MB).');
      }

      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        throw new HttpError(400, 'Isian tidak dapat dibaca.');
      }

      const honeypot = form.get('website');
      // Honeypot terisi berarti bot; beri respons semu agar tidak ada sinyal.
      if (typeof honeypot === 'string' && honeypot.trim() !== '') return json({ ok: true });

      const text = (key: string) => {
        const value = form.get(key);
        return typeof value === 'string' ? value : undefined;
      };
      const parsed = parseFeedbackFields({
        name: text('name'),
        role: text('role'),
        roleDetail: text('roleDetail'),
        message: text('message'),
        rating: text('rating'),
        consent: text('consent'),
      });
      if (!parsed.ok) return json({ error: parsed.message }, 422);

      const ipDigest = createHash('sha256').update(ipForRequest(request)).digest('hex');
      try {
        limit(`feedback:${ipDigest}`, RATE_LIMIT, RATE_WINDOW_MS);
      } catch (error) {
        if (error instanceof HttpError && error.status === 429) {
          logCategory('rate-limited');
          return json({ error: 'Terlalu banyak kiriman. Coba lagi beberapa saat lagi.' }, 429, { 'Retry-After': String(error.retryAfterSeconds ?? 600) });
        }
        throw error;
      }

      const id = await save(parsed.value, form.get('avatar'));
      logCategory('saved');
      schedule(id);
      return json({ ok: true });
    } catch (error) {
      if (error instanceof HttpError) {
        const headers = error.retryAfterSeconds ? { 'Retry-After': String(error.retryAfterSeconds) } : undefined;
        return json({ error: error.message }, error.status, headers);
      }
      logCategory('unavailable');
      return json({ error: UNAVAILABLE_MESSAGE }, 503);
    }
  };
}
