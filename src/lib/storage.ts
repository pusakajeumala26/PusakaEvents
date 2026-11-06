import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { requireEnv } from './env';
import { deleteBatchesWithFallback } from './storage-cleanup';

/**
 * Neon Object Storage (S3-compatible, path-style, SigV4).
 * Bucket bersifat private: struk hanya dibaca lewat server (/api/members/[id]/receipt)
 * setelah memeriksa admin / pemilik struk.
 */
export const BUCKET = process.env.STORAGE_BUCKET || 'struk-kas';

let client: S3Client | null = null;
let bucketReady: Promise<void> | null = null;

function s3() {
  client ??= new S3Client({
    region: requireEnv('AWS_REGION'),
    endpoint: requireEnv('AWS_ENDPOINT_URL_S3'),
    credentials: {
      accessKeyId: requireEnv('AWS_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('AWS_SECRET_ACCESS_KEY'),
    },
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return client;
}

/** Pastikan bucket ada (dibuat sekali per proses bila belum ada dan kredensial mengizinkan). */
function ensureBucket(): Promise<void> {
  bucketReady ??= (async () => {
    try {
      await s3().send(new HeadBucketCommand({ Bucket: BUCKET }));
    } catch (e) {
      const status = (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status !== 404) throw e;
      await s3().send(new CreateBucketCommand({ Bucket: BUCKET }));
    }
  })().catch((e) => {
    bucketReady = null;
    throw e;
  });
  return bucketReady;
}

export async function putReceipt(key: string, data: Buffer) {
  await ensureBucket();
  await s3().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: data,
      ContentType: 'image/webp',
      CacheControl: 'private, max-age=0',
    }),
  );
}

export async function deleteObject(key: string | null | undefined) {
  if (!key) return;
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (e) {
    // Objek yatim lebih baik daripada gagal total; dicatat saja.
    console.error('[storage] hapus objek gagal:', key, e);
  }
}

export async function getReceipt(key: string): Promise<{ body: Uint8Array; contentType: string } | null> {
  try {
    const out = await s3().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    if (!out.Body) return null;
    return { body: await out.Body.transformToByteArray(), contentType: out.ContentType || 'image/webp' };
  } catch (e) {
    const name = (e as { name?: string }).name;
    if (name === 'NoSuchKey' || name === 'NotFound') return null;
    throw e;
  }
}

export async function listReceiptObjects() {
  const objects: { key: string; size: number }[] = [];
  let token: string | undefined;
  do {
    const page = await s3().send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: 'struk/', ContinuationToken: token }));
    for (const item of page.Contents ?? []) if (item.Key) objects.push({ key: item.Key, size: item.Size ?? 0 });
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return objects;
}

export async function deleteReceiptPrefix() {
  const objects = await listReceiptObjects();
  const result = await deleteBatchesWithFallback(
    objects,
    async (batch) => {
      const output = await s3().send(new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: batch.map(({ key }) => ({ Key: key })), Quiet: true },
      }));
      const failedKeys = new Set((output.Errors ?? []).flatMap((error) => error.Key ? [error.Key] : []));
      return { failedItems: batch.filter((item) => failedKeys.has(item.key)) };
    },
    async ({ key }) => { await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })); },
  );
  console.info('[storage] receipt cleanup completed', { listed: objects.length, deleted: result.deleted, failed: result.failed });
  return { listed: objects.length, ...result };
}
