import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Server } from 'node:http';
import app from '../app.js';
import prisma from '../config/database.js';
import { signAccessToken } from '../utils/jwt.js';

test('dashboard summary calculates all account records and isolates users', async () => {
  await prisma.$connect();

  const suffix = `${process.pid}.${Date.now()}`;
  const email = `analytics.${suffix}@example.test`;
  const otherEmail = `analytics.other.${suffix}@example.test`;
  let userId: string | undefined;
  let server: Server | undefined;

  try {
    const user = await prisma.user.create({
      data: {
        name: 'Analytics Test User',
        email,
        passwordHash: 'not-used-by-this-test',
        isVerified: true,
      },
    });
    userId = user.id;
    const otherUser = await prisma.user.create({
      data: {
        name: 'Other Analytics Test User',
        email: otherEmail,
        passwordHash: 'not-used-by-this-test',
        isVerified: true,
      },
    });
    const category = await prisma.category.create({
      data: { name: `Analytics category ${suffix}`, userId: user.id },
    });
    await prisma.income.create({
      data: {
        userId: user.id,
        source: 'Salary',
        amount: 300,
        date: new Date('2026-11-10T00:00:00.000Z'),
      },
    });
    await prisma.expense.createMany({
      data: [
        {
          userId: user.id,
          categoryId: category.id,
          title: 'Groceries',
          amount: 75,
          date: new Date('2026-11-11T00:00:00.000Z'),
        },
        {
          userId: user.id,
          categoryId: category.id,
          title: 'Transport',
          amount: 25,
          date: new Date('2026-11-12T00:00:00.000Z'),
        },
      ],
    });
    await prisma.income.create({
      data: {
        userId: otherUser.id,
        source: 'Other salary',
        amount: 9999,
        date: new Date('2026-11-10T00:00:00.000Z'),
      },
    });

    const token = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
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
    const baseUrl = `http://127.0.0.1:${address.port}/api/v1/analytics/summary`;
    const response = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 200);
    const summary = await response.json() as {
      totalIncome: number;
      totalExpenses: number;
      netBalance: number;
      transactionCount: number;
      incomeCount: number;
      expenseCount: number;
    };
    assert.equal(summary.totalIncome, 300);
    assert.equal(summary.totalExpenses, 100);
    assert.equal(summary.netBalance, 200);
    assert.equal(summary.transactionCount, 3);
    assert.equal(summary.incomeCount, 1);
    assert.equal(summary.expenseCount, 2);

    const monthResponse = await fetch(`${baseUrl}?month=2026-11`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(monthResponse.status, 200);
    const monthSummary = await monthResponse.json() as {
      dateRange: { startDate: string; endDate: string };
    };
    assert.equal(monthSummary.dateRange.startDate, '2026-11-01');
    assert.equal(monthSummary.dateRange.endDate, '2026-11-30');

    const breakdownResponse = await fetch(
      `http://127.0.0.1:${address.port}/api/v1/analytics/category-breakdown`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    assert.equal(breakdownResponse.status, 200);
    const breakdown = await breakdownResponse.json() as {
      totalExpenses: number;
      categories: Array<{ categoryId: string; name: string; amount: number }>;
    };
    assert.equal(breakdown.totalExpenses, 100);
    assert.equal(breakdown.categories.length, 1);
    assert.equal(breakdown.categories[0].amount, 100);

    const trendsResponse = await fetch(
      `http://127.0.0.1:${address.port}/api/v1/analytics/trends?months=6`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    assert.equal(trendsResponse.status, 200);
    const trends = await trendsResponse.json() as {
      monthly: Array<{ income: number; expense: number }>;
      daily: Array<{ date: string; expense: number }>;
    };
    assert.equal(trends.monthly.length, 6);
    assert.equal(trends.daily.length, 30);

    const invalidMonth = await fetch(`${baseUrl}?month=2026-13`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(invalidMonth.status, 400);

    const unauthenticated = await fetch(baseUrl);
    assert.equal(unauthenticated.status, 401);

    const otherResponse = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${otherToken}` },
    });
    assert.equal(otherResponse.status, 200);
    const otherSummary = await otherResponse.json() as {
      totalIncome: number;
      totalExpenses: number;
      transactionCount: number;
    };
    assert.equal(otherSummary.totalIncome, 9999);
    assert.equal(otherSummary.totalExpenses, 0);
    assert.equal(otherSummary.transactionCount, 1);
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => error ? reject(error) : resolve());
      });
    }
    if (userId) {
      await prisma.expense.deleteMany({ where: { userId } });
    }
    await prisma.expense.deleteMany({
      where: { user: { email: otherEmail } },
    });
    await prisma.income.deleteMany({
      where: { OR: [{ userId: userId ?? '' }, { user: { email: otherEmail } }] },
    });
    await prisma.category.deleteMany({
      where: { userId: userId ?? '' },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [email, otherEmail] } },
    });
    await prisma.$disconnect();
  }
});
