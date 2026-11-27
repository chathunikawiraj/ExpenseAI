import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  budgetIdSchema,
  budgetQuerySchema,
  updateBudgetSchema,
  upsertBudgetSchema,
} from '../validators/budget.validator';
import {
  contributionSchema,
  createGoalSchema,
  goalIdSchema,
  updateGoalSchema,
} from '../validators/goal.validator';

test('budget validation accepts overall/category budgets and precise positive amounts', () => {
  const overall = upsertBudgetSchema.parse({
    categoryId: null,
    month: '2026-11',
    amount: '9999999.99',
  });
  assert.equal(overall.categoryId, null);
  assert.equal(overall.amount.toFixed(2), '9999999.99');
  assert.equal(
    upsertBudgetSchema.parse({ month: '2026-02', amount: '0.01' }).amount.toFixed(2),
    '0.01'
  );

  const category = upsertBudgetSchema.parse({
    categoryId: '4a0f4ba2-f55d-47da-99ba-65e6a3c7942d',
    month: '2026-02',
    amount: 0.1,
  });
  assert.equal(category.amount.toFixed(2), '0.10');
});

test('budget validation rejects malformed months and invalid monetary amounts', () => {
  for (const month of ['2026-00', '2026-13', '2026-99', '2026-1', '26-01']) {
    assert.equal(budgetQuerySchema.safeParse({ month }).success, false, month);
  }

  for (const amount of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 10000000, 1.001, '1.001', 'Infinity']) {
    assert.equal(
      upsertBudgetSchema.safeParse({ month: '2026-11', amount }).success,
      false,
      String(amount)
    );
  }
  assert.equal(budgetIdSchema.safeParse('not-a-uuid').success, false);
});

test('budget updates are partial but must contain at least one valid field', () => {
  assert.equal(updateBudgetSchema.safeParse({ amount: '25.50' }).success, true);
  assert.equal(updateBudgetSchema.safeParse({ categoryId: null }).success, true);
  assert.equal(updateBudgetSchema.safeParse({}).success, false);
  assert.equal(updateBudgetSchema.safeParse({ month: '2026-00' }).success, false);
  assert.equal(
    upsertBudgetSchema.safeParse({
      month: '2026-11',
      amount: '1.00',
      userId: '4a0f4ba2-f55d-47da-99ba-65e6a3c7942d',
    }).success,
    false
  );
  assert.equal(
    upsertBudgetSchema.safeParse({
      month: '2026-11',
      categoryId: 'not-a-uuid',
      amount: '1.00',
    }).success,
    false
  );
});

test('goal validation requires a bounded name and valid precise target amount', () => {
  assert.equal(createGoalSchema.safeParse({ name: ' ', targetAmount: 100 }).success, false);
  assert.equal(createGoalSchema.safeParse({ name: 'x'.repeat(101), targetAmount: 100 }).success, false);
  assert.equal(
    createGoalSchema.parse({ name: 'Fund', targetAmount: '9999999.99' }).targetAmount.toFixed(2),
    '9999999.99'
  );

  for (const targetAmount of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 10000000, 1.001, '1.001']) {
    assert.equal(
      createGoalSchema.safeParse({ name: 'Emergency fund', targetAmount }).success,
      false,
      String(targetAmount)
    );
  }
});

test('goal target dates are optional but must be real calendar dates when supplied', () => {
  assert.equal(createGoalSchema.safeParse({ name: 'Fund', targetAmount: 100 }).success, true);
  assert.equal(
    createGoalSchema.safeParse({ name: 'Fund', targetAmount: 100, targetDate: '2024-02-29' }).success,
    true
  );
  assert.equal(
    createGoalSchema.safeParse({ name: 'Fund', targetAmount: 100, targetDate: '2026-02-29' }).success,
    false
  );
  assert.equal(
    updateGoalSchema.safeParse({ targetDate: '2026-04-31' }).success,
    false
  );
  assert.equal(goalIdSchema.safeParse('not-a-uuid').success, false);
});

test('goal validation rejects the unsupported color field', () => {
  assert.equal(
    createGoalSchema.safeParse({ name: 'Fund', targetAmount: 100, color: '#9275F5' }).success,
    false
  );
  assert.equal(
    createGoalSchema.safeParse({
      name: 'Fund',
      targetAmount: 100,
      userId: '4a0f4ba2-f55d-47da-99ba-65e6a3c7942d',
    }).success,
    false
  );
});

test('contribution validation requires a positive precise amount and valid date', () => {
  const valid = contributionSchema.parse({ amount: '12.30', date: '2024-02-29', note: 'Monthly savings' });
  assert.equal(valid.amount.toFixed(2), '12.30');
  assert.equal(contributionSchema.parse({ amount: '0.01' }).amount.toFixed(2), '0.01');
  assert.equal(
    contributionSchema.parse({ amount: '9999999.99' }).amount.toFixed(2),
    '9999999.99'
  );

  for (const amount of [0, -2, Number.NaN, Number.POSITIVE_INFINITY, 10000000, 1.001]) {
    assert.equal(contributionSchema.safeParse({ amount }).success, false, String(amount));
  }
  assert.equal(contributionSchema.safeParse({ amount: 1, date: '2026-02-29' }).success, false);
  assert.equal(contributionSchema.safeParse({ amount: 1, note: 'x'.repeat(301) }).success, false);
  assert.equal(
    contributionSchema.safeParse({
      amount: 1,
      userId: '4a0f4ba2-f55d-47da-99ba-65e6a3c7942d',
    }).success,
    false
  );
});
