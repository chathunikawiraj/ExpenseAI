import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NotificationType } from '@prisma/client';
import type { Server } from 'node:http';
import { assertSafeTestDatabase } from '../test-utils/testDatabaseGuard.js';
import app from '../app.js';
import prisma from '../config/database.js';
import { signAccessToken } from '../utils/jwt.js';

assertSafeTestDatabase();

test('expense and budget changes maintain threshold state and notifications per user', async () => {
  await prisma.$connect();

  const suffix = `${process.pid}.${Date.now()}`;
  const email = `budget-monitor.${suffix}@example.test`;
  const otherEmail = `budget-monitor.other.${suffix}@example.test`;
  let server: Server | undefined;

  try {
    const user = await prisma.user.create({
      data: {
        name: 'Budget Monitor Test User',
        email,
        passwordHash: 'not-used-by-this-test',
        isVerified: true,
      },
    });
    const otherUser = await prisma.user.create({
      data: {
        name: 'Other Budget Monitor Test User',
        email: otherEmail,
        passwordHash: 'not-used-by-this-test',
        isVerified: true,
      },
    });
    const categoryA = await prisma.category.create({
      data: { name: `Monitor Food ${suffix}`, userId: user.id },
    });
    const categoryB = await prisma.category.create({
      data: { name: `Monitor Travel ${suffix}`, userId: user.id },
    });
    const categoryC = await prisma.category.create({
      data: { name: `Monitor Health ${suffix}`, userId: user.id },
    });
    const otherCategory = await prisma.category.create({
      data: { name: `Other Monitor Category ${suffix}`, userId: otherUser.id },
    });
    const token = signAccessToken({ userId: user.id, email: user.email, role: user.role });
    const otherToken = signAccessToken({
      userId: otherUser.id,
      email: otherUser.email,
      role: otherUser.role,
    });
    const apiServer = app.listen(0);
    server = apiServer;
    await new Promise<void>((resolve) => apiServer.once('listening', resolve));
    const address = apiServer.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}/api/v1`;
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const otherHeaders = {
      Authorization: `Bearer ${otherToken}`,
      'Content-Type': 'application/json',
    };

    const saveBudget = async (
      requestHeaders: typeof headers,
      categoryId: string | null,
      month: string,
      amount: number
    ) => {
      const response = await fetch(`${base}/budgets`, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({ categoryId, month, amount }),
      });
      assert.equal(response.status, 200);
      return response.json() as Promise<{ id: string; spent: number; amount: number; percentage: number }>;
    };
    const createExpense = async (
      requestHeaders: typeof headers,
      categoryId: string,
      amount: number,
      date: string
    ) => {
      const response = await fetch(`${base}/expenses`, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({
          title: `Threshold test ${suffix}`,
          amount,
          date,
          categoryId,
          paymentMethod: 'CASH',
        }),
      });
      assert.equal(response.status, 201);
      return response.json() as Promise<{ id: string }>;
    };
    const updateExpense = async (
      expenseId: string,
      values: { amount?: number; date?: string; categoryId?: string }
    ) => {
      const response = await fetch(`${base}/expenses/${expenseId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(values),
      });
      assert.equal(response.status, 200);
      return response.json() as Promise<{ id: string }>;
    };
    const updateBudget = async (
      budgetId: string,
      values: { amount?: number; month?: string; categoryId?: string | null }
    ) => {
      const response = await fetch(`${base}/budgets/${budgetId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(values),
      });
      assert.equal(response.status, 200);
      return response.json() as Promise<{
        id: string;
        categoryId: string | null;
        month: string;
        spent: number;
        percentage: number;
      }>;
    };
    const userNotificationCount = () =>
      prisma.notification.count({ where: { userId: user.id } });
    const activeEvents = async () => {
      const budgets = await prisma.budget.findMany({
        where: { userId: user.id },
        select: { id: true },
      });
      return prisma.budgetThresholdEvent.count({
        where: { budgetId: { in: budgets.map((budget) => budget.id) } },
      });
    };

    await saveBudget(headers, null, '2026-06', 100);
    await saveBudget(headers, categoryA.id, '2026-06', 100);
    await saveBudget(headers, categoryB.id, '2026-06', 100);
    await saveBudget(headers, null, '2026-07', 100);
    await saveBudget(headers, categoryB.id, '2026-07', 100);
    await saveBudget(otherHeaders, null, '2026-06', 100);
    await saveBudget(otherHeaders, otherCategory.id, '2026-06', 100);

    const expense = await createExpense(headers, categoryA.id, 110, '2026-06-08');
    assert.equal(await userNotificationCount(), 6);
    assert.equal(await activeEvents(), 6);
    for (const type of [
      NotificationType.BUDGET_50,
      NotificationType.BUDGET_80,
      NotificationType.BUDGET_100,
    ]) {
      assert.equal(await prisma.notification.count({ where: { userId: user.id, type } }), 2);
    }
    assert.equal(await prisma.notification.count({ where: { userId: otherUser.id } }), 0);

    await createExpense(headers, categoryA.id, 5, '2026-06-09');
    assert.equal(await userNotificationCount(), 6);

    await updateExpense(expense.id, { amount: 20 });
    assert.equal(await activeEvents(), 0);
    assert.equal(await userNotificationCount(), 6);

    await updateExpense(expense.id, { amount: 110 });
    assert.equal(await userNotificationCount(), 12);
    assert.equal(await activeEvents(), 6);

    await updateExpense(expense.id, { categoryId: categoryB.id });
    assert.equal(await prisma.budgetThresholdEvent.count({
      where: {
        budget: { userId: user.id, categoryId: categoryA.id },
      },
    }), 0);
    assert.equal(await userNotificationCount(), 15);

    await updateExpense(expense.id, { date: '2026-07-08' });
    assert.equal(await userNotificationCount(), 21);
    assert.equal(await activeEvents(), 6);

    const deleteResponse = await fetch(`${base}/expenses/${expense.id}`, {
      method: 'DELETE',
      headers,
    });
    assert.equal(deleteResponse.status, 200);
    assert.equal(await activeEvents(), 0);
    assert.equal(await userNotificationCount(), 21);

    await createExpense(headers, categoryA.id, 60, '2026-05-10');
    const mayBudget = await saveBudget(headers, categoryA.id, '2026-05', 100);
    assert.equal(mayBudget.spent, 60);
    const upsertedMayBudget = await saveBudget(headers, categoryA.id, '2026-05', 100);
    assert.equal(upsertedMayBudget.id, mayBudget.id);
    const notificationCountAtMay50 = await userNotificationCount();

    await updateBudget(mayBudget.id, { amount: 200 });
    assert.equal(await prisma.budgetThresholdEvent.count({ where: { budgetId: mayBudget.id } }), 0);
    await updateBudget(mayBudget.id, { amount: 50 });
    assert.equal(await prisma.budgetThresholdEvent.count({ where: { budgetId: mayBudget.id } }), 3);
    assert.equal(await userNotificationCount(), notificationCountAtMay50 + 3);

    const augustExpense = await createExpense(headers, categoryC.id, 70, '2026-08-12');
    const movedBudget = await updateBudget(mayBudget.id, {
      categoryId: categoryC.id,
      month: '2026-08',
      amount: 100,
    });
    assert.equal(movedBudget.categoryId, categoryC.id);
    assert.equal(movedBudget.month, '2026-08');
    assert.equal(movedBudget.spent, 70);
    assert.equal(movedBudget.percentage, 70);
    assert.equal(await prisma.budgetThresholdEvent.count({ where: { budgetId: mayBudget.id } }), 1);

    const forbiddenUpdate = await fetch(`${base}/budgets/${mayBudget.id}`, {
      method: 'PUT',
      headers: otherHeaders,
      body: JSON.stringify({ amount: 999 }),
    });
    assert.equal(forbiddenUpdate.status, 404);
    assert.equal(await prisma.notification.count({ where: { userId: otherUser.id } }), 0);

    const finalDelete = await fetch(`${base}/expenses/${augustExpense.id}`, {
      method: 'DELETE',
      headers,
    });
    assert.equal(finalDelete.status, 200);
    assert.equal(await prisma.budgetThresholdEvent.count({ where: { budgetId: mayBudget.id } }), 0);
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => error ? reject(error) : resolve());
      });
    }
    await prisma.user.deleteMany({ where: { email: { in: [email, otherEmail] } } });
    await prisma.$disconnect();
  }
});
