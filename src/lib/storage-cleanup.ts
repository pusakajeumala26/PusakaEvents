export type DeleteResult = { deleted: number; failed: number };

const isUnsupported = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const e = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  return e.$metadata?.httpStatusCode === 501 || e.name === 'NotImplemented' || e.name === 'NotImplementedException' || e.Code === 'NotImplemented';
};

async function withLimit<T>(items: T[], limit: number, work: (item: T) => Promise<boolean>) {
  let cursor = 0;
  let deleted = 0;
  let failed = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      try { if (await work(item)) deleted += 1; else failed += 1; }
      catch { failed += 1; }
    }
  });
  await Promise.all(workers);
  return { deleted, failed };
}

/** Delete in S3-sized batches, falling back to bounded DeleteObject calls for 501. */
export async function deleteBatchesWithFallback<T>(
  items: T[],
  deleteBatch: (batch: T[]) => Promise<{ failedItems?: T[] }>,
  deleteOne: (item: T) => Promise<void>,
): Promise<DeleteResult> {
  let deleted = 0;
  let failed = 0;
  for (let i = 0; i < items.length; i += 1000) {
    const batch = items.slice(i, i + 1000);
    let failedItems: T[];
    try {
      const result = await deleteBatch(batch);
      deleted += batch.length - (result.failedItems?.length ?? 0);
      failedItems = result.failedItems ?? [];
    } catch (error) {
      if (!isUnsupported(error)) { failed += batch.length; continue; }
      failedItems = batch;
    }
    const retry = await withLimit(failedItems, 4, async (item) => { await deleteOne(item); return true; });
    deleted += retry.deleted;
    failed += retry.failed;
  }
  return { deleted, failed };
}

export function safeReceiptFilename(name: string, id: string, seen: Set<string>) {
  const base = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'anggota';
  let slug = base;
  let suffix = 2;
  while (seen.has(`${slug}-${id}.webp`)) slug = `${base}-${suffix++}`;
  const file = `${slug}-${id.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 48)}.webp`;
  seen.add(file);
  return file;
}
