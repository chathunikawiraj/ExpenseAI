import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Server } from 'node:http';
import { assertSafeTestDatabase } from '../test-utils/testDatabaseGuard.js';
import app from '../app.js';
import prisma from '../config/database.js';
import { signAccessToken } from '../utils/jwt.js';

assertSafeTestDatabase();

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
    await prisma.income.createMany({
      data: [
        {
          userId: user.id,
          source: 'Salary',
          amount: 300,
          date: new Date('2026-11-10T00:00:00.000Z'),
        },
        {
          userId: user.id,
          source: 'October income',
          amount: 40,
          date: new Date('2026-10-31T00:00:00.000Z'),
        },
        {
          userId: user.id,
          source: 'Month start income',
          amount: 10,
          date: new Date('2026-11-01T00:00:00.000Z'),
        },
        {
          userId: user.id,
          source: 'Month end income',
          amount: 20,
          date: new Date('2026-11-30T00:00:00.000Z'),
        },
        {
          userId: user.id,
          source: 'Decimal income',
          amount: '0.10',
          date: new Date('2026-11-13T00:00:00.000Z'),
        },
        {
          userId: user.id,
          source: 'Decimal income',
          amount: '0.20',
          date: new Date('2026-11-13T00:00:00.000Z'),
        },
      ],
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
        {
          userId: user.id,
          categoryId: category.id,
          title: 'Month start expense',
          amount: 7,
          date: new Date('2026-11-01T00:00:00.000Z'),
        },
        {
          userId: user.id,
          categoryId: category.id,
          title: 'Month end expense',
          amount: 8,
          date: new Date('2026-11-30T00:00:00.000Z'),
        },
        {
          userId: user.id,
          categoryId: category.id,
          title: 'December expense',
          amount: 9,
          date: new Date('2026-12-01T00:00:00.000Z'),
        },
        {
          userId: user.id,
          categoryId: category.id,
          title: 'Decimal expense',
          amount: '1.23',
          date: new Date('2026-11-14T00:00:00.000Z'),
        },
        {
          userId: user.id,
          categoryId: category.id,
          title: 'Decimal expense',
          amount: '4.56',
          date: new Date('2026-11-14T00:00:00.000Z'),
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
    assert.equal(summary.totalIncome, 370.3);
    assert.equal(summary.totalExpenses, 129.79);
    assert.equal(summary.netBalance, 240.51);
    assert.equal(summary.transactionCount, 13);
    assert.equal(summary.incomeCount, 6);
    assert.equal(summary.expenseCount, 7);

    const monthResponse = await fetch(`${baseUrl}?month=2026-11`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(monthResponse.status, 200);
    const monthSummary = await monthResponse.json() as {
      dateRange: { startDate: string; endDate: string };
      totalIncome: number;
      totalExpenses: number;
    };
    assert.equal(monthSummary.dateRange.startDate, '2026-11-01');
    assert.equal(monthSummary.dateRange.endDate, '2026-11-30');
    assert.equal(monthSummary.totalIncome, 330.3);
    assert.equal(monthSummary.totalExpenses, 120.79);

    const breakdownResponse = await fetch(
      `http://127.0.0.1:${address.port}/api/v1/analytics/category-breakdown`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    assert.equal(breakdownResponse.status, 200);
    const breakdown = await breakdownResponse.json() as {
      totalExpenses: number;
      categories: Array<{ categoryId: string; name: string; amount: number }>;
    };
    assert.equal(breakdown.totalExpenses, 129.79);
    assert.equal(breakdown.categories.length, 1);
    assert.equal(breakdown.categories[0].amount, 129.79);

    const trendsResponse = await fetch(
      `http://127.0.0.1:${address.port}/api/v1/analytics/trends?months=6`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    assert.equal(trendsResponse.status, 200);
    const trends = await trendsResponse.json() as {
      monthly: Array<{ income: number; expense: number }>;
      daily: Array<{ date: string; income: number; expense: number }>;
    };
    assert.equal(trends.monthly.length, 6);
    assert.equal(trends.daily.length, 30);
    assert.equal(
      trends.monthly.reduce((total, month) => total + month.income, 0),
      370.3,
    );
    assert.equal(
      trends.monthly.reduce((total, month) => total + month.expense, 0),
      120.79,
    );

    const selectedTrendsResponse = await fetch(
      `http://127.0.0.1:${address.port}/api/v1/analytics/trends?month=2026-11&months=6`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    assert.equal(selectedTrendsResponse.status, 200);
    const selectedTrends = await selectedTrendsResponse.json() as {
      monthly: Array<{ month: string; income: number; expense: number }>;
      daily: Array<{ date: string; income: number; expense: number }>;
    };
    assert.equal(selectedTrends.monthly.length, 1);
    assert.deepEqual(selectedTrends.monthly[0], {
      month: '2026-11',
      income: 330.3,
      expense: 120.79,
    });
    assert.equal(selectedTrends.daily.length, 30);
    assert.deepEqual(selectedTrends.daily[0], {
      date: '2026-11-01',
      income: 10,
      expense: 7,
    });
    assert.deepEqual(selectedTrends.daily[1], {
      date: '2026-11-02',
      income: 0,
      expense: 0,
    });
    assert.deepEqual(selectedTrends.daily[9], {
      date: '2026-11-10',
      income: 300,
      expense: 0,
    });
    assert.deepEqual(selectedTrends.daily[10], {
      date: '2026-11-11',
      income: 0,
      expense: 75,
    });
    assert.deepEqual(selectedTrends.daily[12], {
      date: '2026-11-13',
      income: 0.3,
      expense: 0,
    });
    assert.deepEqual(selectedTrends.daily[13], {
      date: '2026-11-14',
      income: 0,
      expense: 5.79,
    });
    assert.deepEqual(selectedTrends.daily[29], {
      date: '2026-11-30',
      income: 20,
      expense: 8,
    });
    assert.equal(
      selectedTrends.daily.reduce((total, day) => total + day.income, 0),
      selectedTrends.monthly[0].income,
    );
    assert.equal(
      selectedTrends.daily.reduce((total, day) => total + day.expense, 0),
      selectedTrends.monthly[0].expense,
    );

    const emptyMonthResponse = await fetch(
      `http://127.0.0.1:${address.port}/api/v1/analytics/trends?month=2026-09`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    assert.equal(emptyMonthResponse.status, 200);
    const emptyMonthTrends = await emptyMonthResponse.json() as {
      monthly: Array<{ month: string; income: number; expense: number }>;
      daily: Array<{ income: number; expense: number }>;
    };
    assert.deepEqual(emptyMonthTrends.monthly, [{
      month: '2026-09',
      income: 0,
      expense: 0,
    }]);
    assert.equal(emptyMonthTrends.daily.length, 30);
    assert.ok(emptyMonthTrends.daily.every(({ income, expense }) => income === 0 && expense === 0));

    const leapMonthResponse = await fetch(
      `http://127.0.0.1:${address.port}/api/v1/analytics/trends?month=2028-02`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    assert.equal(leapMonthResponse.status, 200);
    const leapMonthTrends = await leapMonthResponse.json() as {
      monthly: Array<{ month: string; income: number; expense: number }>;
      daily: Array<{ date: string; income: number; expense: number }>;
    };
    assert.deepEqual(leapMonthTrends.monthly, [{
      month: '2028-02',
      income: 0,
      expense: 0,
    }]);
    assert.equal(leapMonthTrends.daily.length, 29);
    assert.equal(leapMonthTrends.daily[0].date, '2028-02-01');
    assert.equal(leapMonthTrends.daily[28].date, '2028-02-29');
    assert.ok(leapMonthTrends.daily.every(({ income, expense }) => income === 0 && expense === 0));

    const otherTrendsResponse = await fetch(
      `http://127.0.0.1:${address.port}/api/v1/analytics/trends?month=2026-11`,
      { headers: { Authorization: `Bearer ${otherToken}` } }
    );
    assert.equal(otherTrendsResponse.status, 200);
    const otherTrends = await otherTrendsResponse.json() as {
      monthly: Array<{ income: number; expense: number }>;
      daily: Array<{ income: number; expense: number }>;
    };
    assert.equal(otherTrends.monthly[0].income, 9999);
    assert.equal(otherTrends.monthly[0].expense, 0);
    assert.equal(otherTrends.daily[9].income, 9999);
    assert.ok(otherTrends.daily.every(({ expense }) => expense === 0));

    const invalidTrendsMonth = await fetch(
      `http://127.0.0.1:${address.port}/api/v1/analytics/trends?month=2026-1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    assert.equal(invalidTrendsMonth.status, 400);

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
