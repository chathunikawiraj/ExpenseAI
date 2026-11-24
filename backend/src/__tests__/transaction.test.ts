import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Server } from 'node:http';
import app from '../app.js';
import prisma from '../config/database.js';
import { signAccessToken } from '../utils/jwt.js';

test('unified transactions globally sort, paginate, filter, and isolate users', async () => {
  await prisma.$connect();

  const suffix = `${process.pid}.${Date.now()}`;
  const email = `transaction.${suffix}@example.test`;
  const otherEmail = `transaction.other.${suffix}@example.test`;
  let userId: string | undefined;
  let server: Server | undefined;

  try {
    const user = await prisma.user.create({
      data: {
        name: 'Unified Transaction User',
        email,
        passwordHash: 'not-used-by-this-test',
        isVerified: true,
      },
    });
    userId = user.id;
    const otherUser = await prisma.user.create({
      data: {
        name: 'Other Unified Transaction User',
        email: otherEmail,
        passwordHash: 'not-used-by-this-test',
        isVerified: true,
      },
    });
    const category = await prisma.category.create({
      data: { name: `Unified category ${suffix}`, userId: user.id },
    });
    await prisma.income.create({
      data: {
        userId: user.id,
        source: `Unified salary ${suffix}`,
        amount: 200,
        date: new Date('2026-11-20T00:00:00.000Z'),
        description: 'pay for testing',
      },
    });
    await prisma.expense.create({
      data: {
        userId: user.id,
        categoryId: category.id,
        title: `Unified groceries ${suffix}`,
        amount: 50,
        date: new Date('2026-11-21T00:00:00.000Z'),
        paymentMethod: 'CASH',
        description: 'groceries for testing',
      },
    });
    await prisma.expense.create({
      data: {
        userId: otherUser.id,
        categoryId: category.id,
        title: 'Cross-user expense',
        amount: 999,
        date: new Date('2026-11-22T00:00:00.000Z'),
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
    const baseUrl = `http://127.0.0.1:${address.port}/api/v1/transactions`;
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const unauthenticated = await fetch(baseUrl);
    assert.equal(unauthenticated.status, 401);

    const listResponse = await fetch(
      `${baseUrl}?type=all&sortBy=amount&order=desc&page=1&limit=1`,
      { headers }
    );
    assert.equal(listResponse.status, 200);
    const listed = await listResponse.json() as {
      data: Array<{ type: string; amount: number }>;
      meta: { total: number; page: number; limit: number; totalPages: number };
    };
    assert.equal(listed.meta.total, 2);
    assert.equal(listed.meta.totalPages, 2);
    assert.equal(listed.data.length, 1);
    assert.equal(listed.data[0].type, 'income');
    assert.equal(listed.data[0].amount, 200);

    const expenseResponse = await fetch(
      `${baseUrl}?type=expense&categoryId=${category.id}&search=groceries&paymentMethod=CASH`,
      { headers }
    );
    assert.equal(expenseResponse.status, 200);
    const expenses = await expenseResponse.json() as {
      data: Array<{ type: string; categoryId: string }>;
      meta: { total: number };
    };
    assert.equal(expenses.meta.total, 1);
    assert.equal(expenses.data[0].type, 'expense');
    assert.equal(expenses.data[0].categoryId, category.id);

    const invalidRange = await fetch(
      `${baseUrl}?startDate=2026-12-01&endDate=2026-11-01`,
      { headers }
    );
    assert.equal(invalidRange.status, 400);

    const invalidSort = await fetch(`${baseUrl}?sortBy=title`, { headers });
    assert.equal(invalidSort.status, 400);

    const otherList = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${otherToken}` },
    });
    assert.equal(otherList.status, 200);
    const otherData = await otherList.json() as {
      data: unknown[];
      meta: { total: number };
    };
    assert.equal(otherData.meta.total, 1);
    assert.equal(otherData.data.length, 1);
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
    await prisma.category.deleteMany({
      where: { userId: userId ?? '' },
    });
    await prisma.income.deleteMany({
      where: { OR: [{ userId: userId ?? undefined }, { user: { email: otherEmail } }] },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [email, otherEmail] } },
    });
    await prisma.$disconnect();
  }
});
