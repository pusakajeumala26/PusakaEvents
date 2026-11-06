import test from 'node:test';
import assert from 'node:assert/strict';
import { closePeriodWorkflow } from '../src/lib/period-close.ts';
import { safeReceiptFilename, deleteBatchesWithFallback } from '../src/lib/storage-cleanup.ts';
import { createZip } from '../src/lib/zip-store.ts';
import { unzipSync, strFromU8 } from 'fflate';

const input = { confirmName: 'Periode Lama', password: 'secret', archivedReceiptCount: 1, newPeriod: {} };

test('commits the transaction before storage cleanup', async () => {
  const order = [];
  const result = await closePeriodWorkflow(input, {
    passwordMatches: async () => true,
    countReceipts: async () => 1,
    commit: async () => { order.push('transaction'); return { id: 'p1' }; },
    cleanup: async () => { order.push('cleanup'); return { deleted: 1, failed: 0 }; },
    markPartial: async () => { order.push('partial'); },
    markClean: async () => { order.push('clean'); },
  });
  assert.deepEqual(order, ['transaction', 'cleanup', 'clean']);
  assert.equal(result.cleanupStatus, 'OK');
});

test('rejects a changed receipt count without committing', async () => {
  let committed = false;
  await assert.rejects(closePeriodWorkflow(input, {
    passwordMatches: async () => true,
    countReceipts: async () => 2,
    commit: async () => { committed = true; return { id: 'p1' }; },
    cleanup: async () => ({ deleted: 0, failed: 0 }),
    markPartial: async () => {},
    markClean: async () => {},
  }), (error) => error.code === 'RECEIPT_COUNT_CHANGED');
  assert.equal(committed, false);
});

test('rejects a wrong password before counting or committing', async () => {
  let counted = false;
  await assert.rejects(closePeriodWorkflow(input, {
    passwordMatches: async () => false,
    countReceipts: async () => { counted = true; return 1; },
    commit: async () => { throw new Error('should not commit'); },
    cleanup: async () => ({ deleted: 0, failed: 0 }),
    markPartial: async () => {},
    markClean: async () => {},
  }), (error) => error.code === 'PASSWORD_INVALID');
  assert.equal(counted, false);
});

test('receipt filenames are safe and unique for duplicate or hostile names', () => {
  const seen = new Set();
  const first = safeReceiptFilename('../../Älice ???', 'abc-1', seen);
  const second = safeReceiptFilename('../../Älice ???', 'abc-1', seen);
  assert.equal(first, 'alice-abc-1.webp');
  assert.equal(second, 'alice-2-abc-1.webp');
  assert.doesNotMatch(first, /[\\/]/);
});

test('falls back to bounded single deletes when DeleteObjects returns 501', async () => {
  const singles = [];
  const result = await deleteBatchesWithFallback(['a', 'b', 'c'], async () => {
    throw Object.assign(new Error('unsupported'), { $metadata: { httpStatusCode: 501 } });
  }, async (key) => { singles.push(key); });
  assert.equal(result.failed, 0);
  assert.equal(result.deleted, 3);
  assert.deepEqual(singles.sort(), ['a', 'b', 'c']);
});

test('creates a valid browser-compatible streaming ZIP archive', async () => {
  const archive = await createZip([{ name: 'rekap.csv', data: 'nama\r\nAulia\r\n' }, { name: 'struk/', data: new Uint8Array() }]);
  const contents = unzipSync(new Uint8Array(await archive.arrayBuffer()));
  assert.equal(strFromU8(contents['rekap.csv']), 'nama\r\nAulia\r\n');
  assert.ok(contents['struk/']);
});
