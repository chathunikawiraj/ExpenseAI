import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertSafeTestDatabase } from '../test-utils/testDatabaseGuard.js';

const safeUrl =
  'postgresql://test_user:test_password@127.0.0.1:55432/expenseai_task6_test?schema=public';

test('database guard permits only matching local PostgreSQL test URLs', () => {
  assert.doesNotThrow(() => assertSafeTestDatabase(safeUrl, safeUrl, safeUrl));
  assert.doesNotThrow(() => assertSafeTestDatabase(safeUrl, safeUrl, ''));
});

test('database guard rejects missing or mismatched database URLs', () => {
  assert.throws(() => assertSafeTestDatabase(undefined, safeUrl, ''), /exactly match/);
  assert.throws(
    () => assertSafeTestDatabase(safeUrl, `${safeUrl}&other=true`, ''),
    /exactly match/,
  );
  assert.throws(
    () => assertSafeTestDatabase(safeUrl, safeUrl, 'postgresql://remote/test'),
    /DIRECT_URL/,
  );
});

test('database guard rejects remote hosts and names without a test marker', () => {
  const remoteUrl =
    'postgresql://test_user:test_password@db.example.com:55432/expenseai_task6_test';
  const nonTestUrl =
    'postgresql://test_user:test_password@127.0.0.1:55432/expenseai_development';

  assert.throws(() => assertSafeTestDatabase(remoteUrl, remoteUrl, ''), /local PostgreSQL/);
  assert.throws(() => assertSafeTestDatabase(nonTestUrl, nonTestUrl, ''), /database name/);
});
