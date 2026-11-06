import type { Prisma } from '@prisma/client';

/** Shared transaction lock for period closure and receipt/member writes. */
export async function lockPeriodMutations(tx: Prisma.TransactionClient) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(190001, 1)`;
}
