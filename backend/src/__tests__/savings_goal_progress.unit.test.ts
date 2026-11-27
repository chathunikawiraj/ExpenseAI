import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Prisma } from '@prisma/client';
import {
  calculateSavingsGoalProgress,
  shouldNotifyGoalCompletion,
} from '../services/planning.service.js';
import {
  contributionQuerySchema,
  contributionSchema,
  createGoalSchema,
  updateGoalSchema,
} from '../validators/goal.validator.js';

test('goal progress keeps excess savings and caps completion percentage', () => {
  const noContributions = calculateSavingsGoalProgress(
    new Prisma.Decimal('9999999.99'),
    new Prisma.Decimal('0.00')
  );
  assert.equal(noContributions.savedAmount.toFixed(2), '0.00');
  assert.equal(noContributions.remainingAmount.toFixed(2), '9999999.99');
  assert.equal(noContributions.isCompleted, false);

  const smallContribution = calculateSavingsGoalProgress(
    new Prisma.Decimal('1.00'),
    new Prisma.Decimal('0.01')
  );
  assert.equal(smallContribution.savedAmount.toFixed(2), '0.01');
  assert.equal(smallContribution.remainingAmount.toFixed(2), '0.99');

  const underTarget = calculateSavingsGoalProgress(
    new Prisma.Decimal('100.00'),
    new Prisma.Decimal('25.50')
  );
  assert.equal(underTarget.savedAmount.toFixed(2), '25.50');
  assert.equal(underTarget.remainingAmount.toFixed(2), '74.50');
  assert.equal(underTarget.percentage.toFixed(2), '25.50');
  assert.equal(underTarget.isCompleted, false);

  const exactTarget = calculateSavingsGoalProgress(
    new Prisma.Decimal('100.00'),
    new Prisma.Decimal('100.00')
  );
  assert.equal(exactTarget.remainingAmount.toFixed(2), '0.00');
  assert.equal(exactTarget.percentage.toFixed(2), '100.00');
  assert.equal(exactTarget.isCompleted, true);

  const overTarget = calculateSavingsGoalProgress(
    new Prisma.Decimal('100.00'),
    new Prisma.Decimal('125.25')
  );
  assert.equal(overTarget.savedAmount.toFixed(2), '125.25');
  assert.equal(overTarget.remainingAmount.toFixed(2), '0.00');
  assert.equal(overTarget.percentage.toFixed(2), '100.00');
  assert.equal(overTarget.isCompleted, true);

  const negativeSaved = calculateSavingsGoalProgress(
    new Prisma.Decimal('100.00'),
    new Prisma.Decimal('-1.00')
  );
  assert.equal(negativeSaved.savedAmount.toFixed(2), '0.00');
  assert.equal(negativeSaved.isCompleted, false);
});

test('goal completion notifications are emitted only on incomplete-to-complete transitions', () => {
  assert.equal(shouldNotifyGoalCompletion(false, true), true);
  assert.equal(shouldNotifyGoalCompletion(true, true), false);
  assert.equal(shouldNotifyGoalCompletion(true, false), false);
  assert.equal(shouldNotifyGoalCompletion(false, false), false);
});

test('goal and contribution validation accepts optional dates and rejects invalid input', () => {
  assert.equal(
    createGoalSchema.safeParse({ name: 'Emergency fund', targetAmount: '100.00' }).success,
    true
  );
  assert.equal(
    createGoalSchema.safeParse({
      name: 'Emergency fund',
      targetAmount: 100,
      targetDate: '2026-02-29',
    }).success,
    false
  );
  assert.equal(updateGoalSchema.safeParse({ targetDate: null }).success, true);

  for (const amount of [0, -1, 1.001, '1.001', Number.NaN]) {
    assert.equal(contributionSchema.safeParse({ amount }).success, false, String(amount));
  }
  assert.equal(
    contributionSchema.safeParse({ amount: 10, date: '2026-04-31' }).success,
    false
  );
  assert.equal(
    contributionSchema.safeParse({ amount: 10, note: 'x'.repeat(301) }).success,
    false
  );
  assert.equal(contributionQuerySchema.safeParse({ page: 1, limit: 20 }).success, true);
  assert.equal(contributionQuerySchema.safeParse({ page: 0 }).success, false);
});
