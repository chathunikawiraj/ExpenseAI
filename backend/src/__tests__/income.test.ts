import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Server } from 'node:http';
import app from '../app.js';
import prisma from '../config/database.js';
import { signAccessToken } from '../utils/jwt.js';

test('income CRUD is authenticated and scoped to the owning user', async () => {
  await prisma.$connect();

  const suffix = `${process.pid}.${Date.now()}`;
  const email = `income.${suffix}@example.test`;
  const otherEmail = `income.other.${suffix}@example.test`;
  let server: Server | undefined;

  try {
    const user = await prisma.user.create({
      data: {
        name: 'Income Test User',
        email,
        passwordHash: 'not-used-by-this-test',
        isVerified: true,
      },
    });
    const otherUser = await prisma.user.create({
      data: {
        name: 'Other Income Test User',
        email: otherEmail,
        passwordHash: 'not-used-by-this-test',
        isVerified: true,
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
    const baseUrl = `http://127.0.0.1:${address.port}/api/incomes`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const createResponse = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source: 'Salary',
        amount: 1750.25,
        date: '2026-11-20',
        description: 'Monthly pay',
      }),
    });
    assert.equal(createResponse.status, 201);
    const created = await createResponse.json() as {
      id: string;
      userId: string;
      amount: number;
      source: string;
      description: string;
    };
    assert.equal(created.userId, user.id);
    assert.equal(created.amount, 1750.25);
    assert.equal(created.source, 'Salary');

    const listResponse = await fetch(`${baseUrl}?source=Salary`, { headers });
    assert.equal(listResponse.status, 200);
    const listed = await listResponse.json() as {
      data: Array<{ id: string }>;
      meta: { total: number; page: number; limit: number };
    };
    assert.ok(listed.data.some((income) => income.id === created.id));
    assert.equal(listed.meta.page, 1);

    const searchResponse = await fetch(
      `${baseUrl}?search=${encodeURIComponent('monthly')}&startDate=2026-11-01&endDate=2026-11-30&sortBy=amount&order=desc&page=1&limit=10`,
      { headers }
    );
    assert.equal(searchResponse.status, 200);
    const searched = await searchResponse.json() as {
      data: Array<{ id: string }>;
      meta: { total: number; page: number; limit: number };
    };
    assert.ok(searched.data.some((income) => income.id === created.id));
    assert.equal(searched.meta.total, 1);

    const invalidRangeResponse = await fetch(
      `${baseUrl}?startDate=2026-12-01&endDate=2026-11-01`,
      { headers }
    );
    assert.equal(invalidRangeResponse.status, 400);

    const invalidSortResponse = await fetch(`${baseUrl}?sortBy=description`, { headers });
    assert.equal(invalidSortResponse.status, 400);

    const invalidDateResponse = await fetch(`${baseUrl}?startDate=2026-02-31`, { headers });
    assert.equal(invalidDateResponse.status, 400);

    const readResponse = await fetch(`${baseUrl}/${created.id}`, { headers });
    assert.equal(readResponse.status, 200);
    assert.equal((await readResponse.json() as { id: string }).id, created.id);

    const unauthorizedRead = await fetch(`${baseUrl}/${created.id}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherToken}`,
      },
    });
    assert.equal(unauthorizedRead.status, 404);

    const updateResponse = await fetch(`${baseUrl}/${created.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ amount: 2100 }),
    });
    assert.equal(updateResponse.status, 200);
    const updated = await updateResponse.json() as { amount: number; source: string };
    assert.equal(updated.amount, 2100);
    assert.equal(updated.source, 'Salary');

    const deleteResponse = await fetch(`${baseUrl}/${created.id}`, {
      method: 'DELETE',
      headers,
    });
    assert.equal(deleteResponse.status, 200);

    const missingResponse = await fetch(`${baseUrl}/${created.id}`, { headers });
    assert.equal(missingResponse.status, 404);

    const invalidAmountResponse = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source: 'Salary',
        amount: 0,
        date: '2026-11-20',
      }),
    });
    assert.equal(invalidAmountResponse.status, 400);
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => error ? reject(error) : resolve());
      });
    }
    await prisma.user.deleteMany({
      where: { email: { in: [email, otherEmail] } },
    });
    await prisma.$disconnect();
  }
});
