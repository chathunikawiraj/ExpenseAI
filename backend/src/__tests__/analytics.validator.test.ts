import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyticsTrendsQuerySchema } from '../validators/analytics.validator.js';

test('analytics trends keeps the months default and validates optional month selection', () => {
  assert.deepEqual(analyticsTrendsQuerySchema.parse({}), { months: 6 });
  assert.deepEqual(
    analyticsTrendsQuerySchema.parse({ months: '12' }),
    { months: 12 },
  );
  assert.deepEqual(
    analyticsTrendsQuerySchema.parse({ month: '2026-11' }),
    { month: '2026-11', months: 6 },
  );
});

test('analytics trends rejects malformed or impossible selected months', () => {
  for (const month of ['2026-1', '2026-13', '1999-12']) {
    assert.equal(
      analyticsTrendsQuerySchema.safeParse({ month }).success,
      false,
      `Expected ${month} to be rejected`,
    );
  }
});

test('analytics trends rejects invalid months values when a selected month is present', () => {
  assert.equal(
    analyticsTrendsQuerySchema.safeParse({ month: '2026-11', months: '25' }).success,
    false,
  );
});
