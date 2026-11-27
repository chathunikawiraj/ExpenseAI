import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Prisma } from '@prisma/client';
import {
  calculateBudgetProgress,
  planBudgetThresholdTransitions,
} from '../services/budget-monitoring.service.js';

test('budget arithmetic preserves Decimal precision and clamps remaining balance', () => {
  const maximumBudget = calculateBudgetProgress(
    new Prisma.Decimal('9999999.99'),
    new Prisma.Decimal('0.01')
  );
  assert.equal(maximumBudget.remaining.toFixed(2), '9999999.98');

  const underLimit = calculateBudgetProgress(
    new Prisma.Decimal('100.00'),
    new Prisma.Decimal('33.33')
  );
  assert.equal(underLimit.remaining.toFixed(2), '66.67');
  assert.equal(underLimit.percentage.toFixed(2), '33.33');

  const overLimit = calculateBudgetProgress(
    new Prisma.Decimal('100.00'),
    new Prisma.Decimal('125.25')
  );
  assert.equal(overLimit.remaining.toFixed(2), '0.00');
  assert.equal(overLimit.percentage.toFixed(2), '125.25');
});

test('budget transitions honor exact decimal threshold boundaries and existing active events', () => {
  assert.deepEqual(
    planBudgetThresholdTransitions(new Prisma.Decimal('49.99'), []),
    { activate: [], clear: [] }
  );
  assert.deepEqual(
    planBudgetThresholdTransitions(new Prisma.Decimal('50.01'), []),
    { activate: [50], clear: [] }
  );
  assert.deepEqual(
    planBudgetThresholdTransitions(new Prisma.Decimal('79.99'), []),
    { activate: [50], clear: [] }
  );
  assert.deepEqual(
    planBudgetThresholdTransitions(new Prisma.Decimal('80.01'), []),
    { activate: [50, 80], clear: [] }
  );
  assert.deepEqual(
    planBudgetThresholdTransitions(new Prisma.Decimal('99.99'), []),
    { activate: [50, 80], clear: [] }
  );
  assert.deepEqual(
    planBudgetThresholdTransitions(new Prisma.Decimal('100.01'), []),
    { activate: [50, 80, 100], clear: [] }
  );
  assert.deepEqual(
    planBudgetThresholdTransitions(new Prisma.Decimal('100'), [50, 80, 100]),
    { activate: [], clear: [] }
  );
  assert.deepEqual(
    planBudgetThresholdTransitions(new Prisma.Decimal('49.99'), [50]),
    { activate: [], clear: [50] }
  );
});

test('budget thresholds activate at inclusive boundaries and reset below each threshold', () => {
  assert.deepEqual(
    planBudgetThresholdTransitions(new Prisma.Decimal('50'), []),
    { activate: [50], clear: [] }
  );
  assert.deepEqual(
    planBudgetThresholdTransitions(new Prisma.Decimal('110'), []),
    { activate: [50, 80, 100], clear: [] }
  );
  assert.deepEqual(
    planBudgetThresholdTransitions(new Prisma.Decimal('100'), []),
    { activate: [50, 80, 100], clear: [] }
  );
  assert.deepEqual(
    planBudgetThresholdTransitions(new Prisma.Decimal('80'), [50]),
    { activate: [80], clear: [] }
  );
  assert.deepEqual(
    planBudgetThresholdTransitions(new Prisma.Decimal('40'), [50, 80, 100]),
    { activate: [], clear: [50, 80, 100] }
  );
  assert.deepEqual(
    planBudgetThresholdTransitions(new Prisma.Decimal('70'), [50, 80, 100]),
    { activate: [], clear: [80, 100] }
  );
});
