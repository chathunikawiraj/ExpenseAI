import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Server } from 'node:http';
import bcrypt from 'bcrypt';
import app from '../app.js';
import prisma from '../config/database.js';
import { signAccessToken } from '../utils/jwt.js';

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

    const notificationResponse = await fetch(`${base}/notifications`, { headers });
    assert.equal(notificationResponse.status, 200);
    const notifications = await notificationResponse.json() as Array<{ id: string }>;
    assert.ok(notifications.length >= 1);

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
