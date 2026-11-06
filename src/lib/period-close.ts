export type CloseInput<T> = {
  confirmName: string;
  confirmStartedAt?: string;
  password: string;
  archivedReceiptCount: number;
  archivedMemberCount?: number;
  newPeriod: T;
};
export type PeriodCleanupResult = { deleted: number; failed: number };

export async function closePeriodWorkflow<T, R extends { id: string }>(input: CloseInput<T>, deps: {
  passwordMatches: (password: string) => Promise<boolean>;
  countReceipts: () => Promise<number>;
  commit: (input: CloseInput<T>, currentReceiptCount: number) => Promise<R>;
  cleanup: () => Promise<PeriodCleanupResult>;
  markPartial: (id: string) => Promise<void>;
  markClean: (id: string) => Promise<void>;
}) {
  if (!(await deps.passwordMatches(input.password))) throw Object.assign(new Error('Password admin salah.'), { code: 'PASSWORD_INVALID' });
  const currentCount = await deps.countReceipts();
  if (currentCount !== input.archivedReceiptCount) {
    throw Object.assign(new Error('Jumlah struk berubah sejak arsip dibuat. Unduh ulang arsip sebelum menutup periode.'), { code: 'RECEIPT_COUNT_CHANGED' });
  }
  const period = await deps.commit(input, currentCount);
  const cleanup = await deps.cleanup();
  if (cleanup.failed > 0) await deps.markPartial(period.id);
  else await deps.markClean(period.id);
  return { period, cleanup, cleanupStatus: cleanup.failed > 0 ? 'PARTIAL' as const : 'OK' as const };
}
