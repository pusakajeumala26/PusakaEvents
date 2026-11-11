import { createHash } from 'node:crypto';
import { z } from 'zod';
import { assertSameOrigin, clientIp, HttpError, json, rateLimit } from './http.ts';
import type { FeedbackInput, FeedbackResult } from './portfolio-feedback-core.ts';

const MAX_BODY_BYTES = 8 * 1024;
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 10 * 60_000;
const INVALID_MESSAGE = 'Periksa kembali isian masukan.';
const UNAVAILABLE_MESSAGE = 'Masukan belum dapat dikirim saat ini. Coba lagi beberapa saat lagi.';

const optionalText = z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().max(80).optional(),
);

const feedbackSchema = z.object({
  name: z.string().trim().transform((value) => value.replace(/\s+/g, ' ')).pipe(z.string().min(1).max(80)),
  role: optionalText,
  company: optionalText,
  rating: z.number().int().min(1).max(5),
  message: z.string().trim().min(5).max(1500),
  consent: z.literal(true),
  website: z.string().optional(),
}).strict();

type FeedbackHandlerDeps = {
  submit: (input: FeedbackInput) => Promise<FeedbackResult>;
  limit?: typeof rateLimit;
  ipForRequest?: typeof clientIp;
  logCategory?: (category: string) => void;
};

async function readJsonBody(request: Request): Promise<unknown> {
  const lengthHeader = request.headers.get('content-length');
  if (lengthHeader && /^\d+$/.test(lengthHeader) && Number(lengthHeader) > MAX_BODY_BYTES) {
    throw new HttpError(413, 'Ukuran masukan terlalu besar.');
  }
  if (!request.body) throw new HttpError(400, INVALID_MESSAGE);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new HttpError(413, 'Ukuran masukan terlalu besar.');
    }
    chunks.push(value);
  }

  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(body)) as unknown;
  } catch {
    throw new HttpError(400, INVALID_MESSAGE);
  }
}

function unavailableResponse() {
  return json({ error: UNAVAILABLE_MESSAGE }, 503);
}

export function createFeedbackHandler({
  submit,
  limit = rateLimit,
  ipForRequest = clientIp,
  logCategory = (category) => console.info('[feedback] result', category),
}: FeedbackHandlerDeps) {
  return async (request: Request): Promise<Response> => {
    try {
      assertSameOrigin(request);
      const contentType = request.headers.get('content-type') ?? '';
      if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
        throw new HttpError(415, 'Permintaan harus menggunakan JSON.');
      }

      const body = await readJsonBody(request);
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        const website = (body as { website?: unknown }).website;
        // Honeypot terisi berarti kiriman bot; beri respons semu agar bot tidak mendapat sinyal.
        if (typeof website === 'string' && website.trim() !== '') return json({ ok: true });
      }

      const parsed = feedbackSchema.safeParse(body);
      if (!parsed.success) return json({ error: INVALID_MESSAGE }, 400);

      const ipDigest = createHash('sha256').update(ipForRequest(request)).digest('hex');
      try {
        limit(`feedback:${ipDigest}`, RATE_LIMIT, RATE_WINDOW_MS);
      } catch (error) {
        if (error instanceof HttpError && error.status === 429) {
          logCategory('rate-limited');
          return json(
            { error: 'Terlalu banyak kiriman. Coba lagi beberapa saat lagi.' },
            429,
            { 'Retry-After': String(error.retryAfterSeconds ?? 600) },
          );
        }
        throw error;
      }

      const { name, role, company, rating, message } = parsed.data;
      const submission: FeedbackInput = { name, rating, message, project: 'PusakaEvents' };
      if (role) submission.role = role;
      if (company) submission.company = company;
      const result = await submit(submission);
      logCategory(result.status);
      if (result.status === 'ok') return json({ ok: true });
      if (result.status === 'invalid') return json({ error: INVALID_MESSAGE }, 400);
      if (result.status === 'rate-limited') {
        return json({ error: 'Terlalu banyak kiriman. Coba lagi beberapa saat lagi.' }, 429, { 'Retry-After': '60' });
      }
      return unavailableResponse();
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
