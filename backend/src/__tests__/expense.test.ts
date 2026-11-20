import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Server } from 'node:http';
import app from '../app.js';
import prisma from '../config/database.js';
import { signAccessToken } from '../utils/jwt.js';

test('expense CRUD validates categories, filters results, and isolates users', async () => {
  await prisma.$connect();

  const suffix = `${process.pid}.${Date.now()}`;
  const email = `expense.${suffix}@example.test`;
  const otherEmail = `expense.other.${suffix}@example.test`;
  const titlePrefix = `Expense API ${suffix}`;
  let userId: string | undefined;
  let server: Server | undefined;

  try {
    const user = await prisma.user.create({
      data: {
        name: 'Expense Test User',
        email,
        passwordHash: 'not-used-by-this-test',
        isVerified: true,
      },
    });
    userId = user.id;
    const otherUser = await prisma.user.create({
      data: {
        name: 'Other Expense Test User',
        email: otherEmail,
        passwordHash: 'not-used-by-this-test',
        isVerified: true,
      },
    });
    const category = await prisma.category.create({
      data: { name: `Expense category ${suffix}`, userId: user.id },
    });
    const otherCategory = await prisma.category.create({
      data: { name: `Other expense category ${suffix}`, userId: otherUser.id },
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
    const baseUrl = `http://127.0.0.1:${address.port}/api/v1/expenses`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const unauthenticated = await fetch(baseUrl);
    assert.equal(unauthenticated.status, 401);

    const firstResponse = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: `${titlePrefix} grocery`,
        amount: 11.5,
        date: '2026-06-08',
        categoryId: category.id,
        paymentMethod: 'CASH',
        description: 'weekly shop',
      }),
    });
    assert.equal(firstResponse.status, 201);
    const first = await firstResponse.json() as {
      id: string;
      userId: string;
      amount: number;
      category: { id: string };
    };
    assert.equal(first.userId, user.id);
    assert.equal(first.amount, 11.5);
    assert.equal(first.category.id, category.id);

    const secondResponse = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: `${titlePrefix} groceries`,
        amount: 30,
        date: '2026-06-09',
        categoryId: category.id,
        paymentMethod: 'DEBIT_CARD',
      }),
    });
    assert.equal(secondResponse.status, 201);
    const second = await secondResponse.json() as { id: string };

    const invalidCategoryResponse = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: `${titlePrefix} invalid category`,
        amount: 10,
        date: '2026-06-09',
        categoryId: otherCategory.id,
      }),
    });
    assert.equal(invalidCategoryResponse.status, 400);

    const listResponse = await fetch(
      `${baseUrl}?search=${encodeURIComponent(titlePrefix)}&categoryId=${category.id}&startDate=2026-06-08&endDate=2026-06-09&sortBy=amount&sortOrder=desc&page=1&limit=1`,
      { headers }
    );
    assert.equal(listResponse.status, 200);
    const listed = await listResponse.json() as {
      data: Array<{ id: string; amount: number }>;
      meta: { total: number; page: number; limit: number; totalPages: number };
    };
    assert.equal(listed.meta.total, 2);
    assert.equal(listed.meta.totalPages, 2);
    assert.equal(listed.data.length, 1);
    assert.equal(listed.data[0].id, second.id);
    assert.equal(listed.data[0].amount, 30);

    const readResponse = await fetch(`${baseUrl}/${first.id}`, { headers });
    assert.equal(readResponse.status, 200);
    assert.equal((await readResponse.json() as { id: string }).id, first.id);

    const otherUserRead = await fetch(`${baseUrl}/${first.id}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherToken}`,
      },
    });
    assert.equal(otherUserRead.status, 404);

    const invalidCategoryUpdate = await fetch(`${baseUrl}/${first.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ categoryId: otherCategory.id }),
    });
    assert.equal(invalidCategoryUpdate.status, 400);

    const updateResponse = await fetch(`${baseUrl}/${first.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ amount: 15, title: `${titlePrefix} updated` }),
    });
    assert.equal(updateResponse.status, 200);
    const updated = await updateResponse.json() as { amount: number; title: string };
    assert.equal(updated.amount, 15);
    assert.equal(updated.title, `${titlePrefix} updated`);

    const otherUserList = await fetch(baseUrl, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherToken}`,
      },
    });
    assert.equal(otherUserList.status, 200);
    assert.equal((await otherUserList.json() as { data: unknown[] }).data.length, 0);

    const deleteResponse = await fetch(`${baseUrl}/${first.id}`, {
      method: 'DELETE',
      headers,
    });
    assert.equal(deleteResponse.status, 200);

    const missingResponse = await fetch(`${baseUrl}/${first.id}`, { headers });
    assert.equal(missingResponse.status, 404);
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => error ? reject(error) : resolve());
      });
    }
    if (userId) {
      await prisma.expense.deleteMany({ where: { userId } });
      await prisma.category.deleteMany({ where: { userId } });
    }
    await prisma.user.deleteMany({
      where: { email: { in: [email, otherEmail] } },
    });
    await prisma.$disconnect();
  }
});
