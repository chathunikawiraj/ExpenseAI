import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NotificationType, Prisma } from '@prisma/client';
import type { Server } from 'node:http';
import bcrypt from 'bcrypt';
import { assertSafeTestDatabase } from '../test-utils/testDatabaseGuard.js';
import app from '../app.js';
import prisma from '../config/database.js';
import { signAccessToken } from '../utils/jwt.js';
import { upsertBudget } from '../services/planning.service.js';

assertSafeTestDatabase();

test('budgets goals notifications insights password and account operations work securely', async () => {
  await prisma.$connect();
  const suffix = `${process.pid}.${Date.now()}`;
  const email = `planning.${suffix}@example.test`;
  const otherEmail = `planning.other.${suffix}@example.test`;
  let server: Server | undefined;
  let userId: string | undefined;

  try {
    const passwordHash = await bcrypt.hash('TestUser123', 12);
    const user = await prisma.user.create({
      data: { name: 'Planning User', email, passwordHash, isVerified: true },
    });
    userId = user.id;
    const otherUser = await prisma.user.create({
      data: {
        name: 'Other Planning User',
        email: otherEmail,
        passwordHash,
        isVerified: true,
      },
    });
    const category = await prisma.category.create({
      data: { name: `Planning category ${suffix}`, userId: user.id },
    });
    await prisma.expense.create({
      data: {
        userId: user.id,
        categoryId: category.id,
        title: 'Planning expense',
        amount: 60,
        date: new Date('2026-11-12T00:00:00.000Z'),
      },
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

    const unauthorized = await fetch(`${base}/budgets?month=2026-11`);
    assert.equal(unauthorized.status, 401);

    const budgetResponse = await fetch(`${base}/budgets`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ categoryId: category.id, month: '2026-11', amount: 100 }),
    });
    assert.equal(budgetResponse.status, 200);
    const budget = await budgetResponse.json() as {
      id: string;
      spent: number;
      remaining: number;
      percentage: number;
    };
    assert.equal(budget.spent, 60);
    assert.equal(budget.remaining, 40);
    assert.equal(budget.percentage, 60);

    const ownBudgetResponse = await fetch(`${base}/budgets/${budget.id}`, { headers });
    assert.equal(ownBudgetResponse.status, 200);
    const ownBudget = await ownBudgetResponse.json() as {
      id: string;
      categoryId: string;
      spent: number;
      remaining: number;
      percentage: number;
    };
    assert.equal(ownBudget.id, budget.id);
    assert.equal(ownBudget.categoryId, category.id);
    assert.equal(ownBudget.spent, 60);
    assert.equal(ownBudget.remaining, 40);
    assert.equal(ownBudget.percentage, 60);

    const unauthenticatedBudgetRead = await fetch(`${base}/budgets/${budget.id}`);
    assert.equal(unauthenticatedBudgetRead.status, 401);
    const missingBudgetRead = await fetch(
      `${base}/budgets/00000000-0000-4000-8000-000000000001`,
      { headers }
    );
    assert.equal(missingBudgetRead.status, 404);
    assert.equal((await fetch(`${base}/budgets/not-a-uuid`, { headers })).status, 400);
    const unauthenticatedBudgetUpdate = await fetch(`${base}/budgets/${budget.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 125 }),
    });
    assert.equal(unauthenticatedBudgetUpdate.status, 401);

    for (const invalidBody of [
      { amount: 0 },
      { month: '2026-99' },
      {},
    ]) {
      const invalidUpdate = await fetch(`${base}/budgets/${budget.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(invalidBody),
      });
      assert.equal(invalidUpdate.status, 400);
    }

    await assert.rejects(
      prisma.budget.create({
        data: {
          userId: user.id,
          categoryId: category.id,
          month: new Date('2026-11-01T00:00:00.000Z'),
          amount: new Prisma.Decimal('50.00'),
        },
      }),
      (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
    );

    const overallBudgetResponse = await fetch(`${base}/budgets`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ categoryId: null, month: '2026-11', amount: '500.00' }),
    });
    assert.equal(overallBudgetResponse.status, 200);
    const overallBudget = await overallBudgetResponse.json() as { id: string };
    await assert.rejects(
      prisma.budget.create({
        data: {
          userId: user.id,
          categoryId: null,
          month: new Date('2026-11-01T00:00:00.000Z'),
          amount: new Prisma.Decimal('600.00'),
        },
      }),
      (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
    );

    const otherCategory = await prisma.category.create({
      data: { name: `Other category ${suffix}`, userId: otherUser.id },
    });
    const alternateCategory = await prisma.category.create({
      data: { name: `Alternate category ${suffix}`, userId: user.id },
    });
    const invalidCategoryBudgetResponse = await fetch(`${base}/budgets`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ categoryId: otherCategory.id, month: '2026-11', amount: 100 }),
    });
    assert.equal(invalidCategoryBudgetResponse.status, 400);
    const invalidCategoryUpdate = await fetch(`${base}/budgets/${budget.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ categoryId: otherCategory.id }),
    });
    assert.equal(invalidCategoryUpdate.status, 400);

    const updatedAmountResponse = await fetch(`${base}/budgets/${budget.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ amount: '120.00' }),
    });
    assert.equal(updatedAmountResponse.status, 200);
    const updatedAmount = await updatedAmountResponse.json() as {
      amount: number;
      spent: number;
      remaining: number;
      percentage: number;
    };
    assert.equal(updatedAmount.amount, 120);
    assert.equal(updatedAmount.spent, 60);
    assert.equal(updatedAmount.remaining, 60);
    assert.equal(updatedAmount.percentage, 50);

    const updatedMonthResponse = await fetch(`${base}/budgets/${budget.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ month: '2026-12' }),
    });
    assert.equal(updatedMonthResponse.status, 200);
    const updatedMonth = await updatedMonthResponse.json() as {
      month: string;
      spent: number;
      remaining: number;
    };
    assert.equal(updatedMonth.month, '2026-12');
    assert.equal(updatedMonth.spent, 0);
    assert.equal(updatedMonth.remaining, 120);

    const updatedCategoryResponse = await fetch(`${base}/budgets/${budget.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ categoryId: alternateCategory.id }),
    });
    assert.equal(updatedCategoryResponse.status, 200);
    const updatedCategory = await updatedCategoryResponse.json() as {
      categoryId: string;
      category: { id: string; name: string };
    };
    assert.equal(updatedCategory.categoryId, alternateCategory.id);
    assert.equal(updatedCategory.category.id, alternateCategory.id);

    const competingBudgetResponse = await fetch(`${base}/budgets`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        categoryId: category.id,
        month: '2026-12',
        amount: 80,
      }),
    });
    assert.equal(competingBudgetResponse.status, 200);
    const competingBudget = await competingBudgetResponse.json() as { id: string };
    assert.notEqual(competingBudget.id, budget.id);

    const duplicateUpdateResponse = await fetch(`${base}/budgets/${budget.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ categoryId: category.id }),
    });
    assert.equal(duplicateUpdateResponse.status, 409);

    const upsertExistingResponse = await fetch(`${base}/budgets`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ categoryId: alternateCategory.id, month: '2026-12', amount: 140 }),
    });
    assert.equal(upsertExistingResponse.status, 200);
    assert.equal((await upsertExistingResponse.json() as { id: string }).id, budget.id);

    const concurrentBudgets = await Promise.allSettled([
      upsertBudget(user.id, {
        categoryId: category.id,
        month: '2027-01',
        amount: new Prisma.Decimal('20.00'),
      }),
      upsertBudget(user.id, {
        categoryId: category.id,
        month: '2027-01',
        amount: new Prisma.Decimal('30.00'),
      }),
    ]);
    assert.ok(concurrentBudgets.some((result) => result.status === 'fulfilled'));
    for (const result of concurrentBudgets) {
      if (result.status === 'rejected') {
        assert.equal(result.reason.statusCode, 409);
      }
    }
    assert.equal(
      await prisma.budget.count({
        where: {
          userId: user.id,
          categoryId: category.id,
          month: new Date('2027-01-01T00:00:00.000Z'),
        },
      }),
      1
    );

    const budgetList = await fetch(`${base}/budgets?month=2026-11`, { headers });
    assert.equal(budgetList.status, 200);
    assert.equal((await budgetList.json() as unknown[]).length, 1);

    const goalResponse = await fetch(`${base}/goals`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Emergency fund', targetAmount: 1000, savedAmount: 100 }),
    });
    assert.equal(goalResponse.status, 201);
    const goal = await goalResponse.json() as { id: string; savedAmount: number; percentage: number };
    assert.equal(goal.savedAmount, 100);

    const contributionResponse = await fetch(`${base}/goals/${goal.id}/contributions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ amount: 150 }),
    });
    assert.equal(contributionResponse.status, 200);
    const contributed = await contributionResponse.json() as { savedAmount: number; percentage: number };
    assert.equal(contributed.savedAmount, 250);

    const otherGoal = await prisma.savingsGoal.create({
      data: {
        userId: otherUser.id,
        name: 'Private goal',
        targetAmount: new Prisma.Decimal('100.00'),
      },
    });
    const crossUserContribution = await fetch(`${base}/goals/${otherGoal.id}/contributions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ amount: 10 }),
    });
    assert.equal(crossUserContribution.status, 404);

    const notificationResponse = await fetch(`${base}/notifications`, { headers });
    assert.equal(notificationResponse.status, 200);
    const notifications = await notificationResponse.json() as Array<{ id: string }>;
    assert.ok(notifications.length >= 1);
    const privateNotification = await prisma.notification.create({
      data: {
        userId: otherUser.id,
        type: NotificationType.SYSTEM,
        message: 'Private test notification',
      },
    });
    const otherNotificationResponse = await fetch(`${base}/notifications`, {
      headers: otherHeaders,
    });
    assert.equal(otherNotificationResponse.status, 200);
    const otherNotifications = await otherNotificationResponse.json() as Array<{ id: string }>;
    assert.deepEqual(otherNotifications.map(({ id }) => id), [privateNotification.id]);
    assert.equal(notifications.some(({ id }) => id === privateNotification.id), false);
    assert.equal(
      (await fetch(`${base}/notifications/${privateNotification.id}/read`, {
        method: 'PATCH',
        headers,
      })).status,
      404
    );
    assert.equal(
      (await fetch(`${base}/notifications/${privateNotification.id}`, {
        method: 'DELETE',
        headers,
      })).status,
      404
    );
    assert.equal(
      (await prisma.notification.findUnique({ where: { id: privateNotification.id } }))?.isRead,
      false
    );
    assert.equal(
      (await fetch(`${base}/notifications/not-a-uuid/read`, { method: 'PATCH', headers })).status,
      400
    );
    assert.equal(
      (await fetch(`${base}/notifications/not-a-uuid`, { method: 'DELETE', headers })).status,
      400
    );
    assert.equal((await fetch(`${base}/notifications`)).status, 401);

    const insightResponse = await fetch(`${base}/insights/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ period: '2026-11' }),
    });
    assert.equal(insightResponse.status, 201);
    const generated = await insightResponse.json() as { insight: { text: string }; disclaimer: string };
    assert.ok(generated.insight.text.length > 20);
    assert.ok(generated.disclaimer.length > 20);

    const wrongPassword = await fetch(`${base}/auth/password`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ currentPassword: 'WrongPass123', newPassword: 'NewPass123' }),
    });
    assert.equal(wrongPassword.status, 400);

    const changedPassword = await fetch(`${base}/auth/password`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ currentPassword: 'TestUser123', newPassword: 'NewPass123' }),
    });
    assert.equal(changedPassword.status, 200);

    const otherBudget = await fetch(`${base}/budgets?month=2026-11`, {
      headers: { Authorization: `Bearer ${otherToken}` },
    });
    assert.equal(otherBudget.status, 200);
    assert.equal((await otherBudget.json() as unknown[]).length, 0);

    const foreignBudgetResponse = await fetch(`${base}/budgets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${otherToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: otherCategory.id, month: '2026-11', amount: 200 }),
    });
    assert.equal(foreignBudgetResponse.status, 200);
    const foreignBudget = await foreignBudgetResponse.json() as { id: string };
    const userBudgets = await fetch(`${base}/budgets?month=2026-11`, { headers })
      .then((response) => response.json() as Promise<Array<{ id: string }>>);
    const otherUserBudgets = await fetch(`${base}/budgets?month=2026-11`, {
      headers: otherHeaders,
    }).then((response) => response.json() as Promise<Array<{ id: string }>>);
    assert.equal(userBudgets.some(({ id }) => id === foreignBudget.id), false);
    assert.ok(otherUserBudgets.some(({ id }) => id === foreignBudget.id));
    const readForeignBudget = await fetch(`${base}/budgets/${foreignBudget.id}`, { headers });
    assert.equal(readForeignBudget.status, 404);
    const updateForeignBudget = await fetch(`${base}/budgets/${foreignBudget.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ amount: 300 }),
    });
    assert.equal(updateForeignBudget.status, 404);

    const missingBudgetDelete = await fetch(
      `${base}/budgets/00000000-0000-4000-8000-000000000001`,
      { method: 'DELETE', headers }
    );
    assert.equal(missingBudgetDelete.status, 404);
    const unauthenticatedBudgetDelete = await fetch(`${base}/budgets/${foreignBudget.id}`, {
      method: 'DELETE',
    });
    assert.equal(unauthenticatedBudgetDelete.status, 401);
    const foreignBudgetDelete = await fetch(`${base}/budgets/${foreignBudget.id}`, {
      method: 'DELETE',
      headers,
    });
    assert.equal(foreignBudgetDelete.status, 404);

    const thresholdEvent = await prisma.budgetThresholdEvent.create({
      data: { budgetId: overallBudget.id, threshold: 50 },
    });
    assert.ok(thresholdEvent.id);
    const ownBudgetDelete = await fetch(`${base}/budgets/${overallBudget.id}`, {
      method: 'DELETE',
      headers,
    });
    assert.equal(ownBudgetDelete.status, 200);
    assert.equal(
      await prisma.budgetThresholdEvent.count({ where: { budgetId: overallBudget.id } }),
      0
    );

    const deleteResponse = await fetch(`${base}/auth/account`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ confirmation: 'DELETE' }),
    });
    assert.equal(deleteResponse.status, 200);
    assert.equal(await prisma.user.findUnique({ where: { id: userId } }), null);
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => error ? reject(error) : resolve());
      });
    }
    if (userId) {
      await prisma.budget.deleteMany({ where: { userId } });
      await prisma.savingsGoal.deleteMany({ where: { userId } });
      await prisma.expense.deleteMany({ where: { userId } });
      await prisma.category.deleteMany({ where: { userId } });
    }
    await prisma.user.deleteMany({
      where: { email: { in: [email, otherEmail] } },
    });
    await prisma.$disconnect();
  }
});
