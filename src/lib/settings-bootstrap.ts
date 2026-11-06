type SettingsBootstrapStore<T> = {
  findUnique: () => Promise<T | null>;
  create: () => Promise<T>;
};

const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';

/** Read first, then create; a concurrent winner is fetched after a P2002 conflict. */
export async function findOrCreateSettings<T>(store: SettingsBootstrapStore<T>): Promise<T> {
  const existing = await store.findUnique();
  if (existing) return existing;

  try {
    return await store.create();
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const concurrentlyCreated = await store.findUnique();
    if (concurrentlyCreated) return concurrentlyCreated;
    throw error;
  }
}
