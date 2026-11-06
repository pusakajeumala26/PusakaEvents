import test from 'node:test';
import assert from 'node:assert/strict';
import { findOrCreateSettings } from '../src/lib/settings-bootstrap.ts';

test('returns the row created by a concurrent request after P2002', async () => {
  let reads = 0;
  let creates = 0;
  const concurrentlyCreated = { id: 1, letingName: 'Pusaka Jeumala' };
  const result = await findOrCreateSettings({
    findUnique: async () => (++reads === 1 ? null : concurrentlyCreated),
    create: async () => {
      creates += 1;
      throw Object.assign(new Error('duplicate'), { code: 'P2002' });
    },
  });

  assert.equal(result, concurrentlyCreated);
  assert.equal(reads, 2);
  assert.equal(creates, 1);
});

test('propagates database errors other than P2002', async () => {
  const failure = Object.assign(new Error('database unavailable'), { code: 'P1001' });
  await assert.rejects(
    findOrCreateSettings({ findUnique: async () => null, create: async () => { throw failure; } }),
    failure,
  );
});
