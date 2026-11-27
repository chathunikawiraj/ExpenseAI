import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Server } from 'node:http';
import { assertSafeTestDatabase } from '../test-utils/testDatabaseGuard.js';
import app from '../app.js';
import prisma from '../config/database.js';
import { signAccessToken } from '../utils/jwt.js';

assertSafeTestDatabase();

test('receipt confirmation validates ownership and keeps expenses after receipt deletion', async () => {
  await prisma.$connect();

  const suffix = `${process.pid}.${Date.now()}`;
  const email = `receipt.${suffix}@example.test`;
  const otherEmail = `receipt.other.${suffix}@example.test`;
  const createdReceiptIds: string[] = [];
  let userId: string | undefined;
  let otherUserId: string | undefined;
  let server: Server | undefined;

  try {
    const user = await prisma.user.create({
      data: {
        name: 'Receipt Test User',
        email,
        passwordHash: 'not-used-by-this-test',
        isVerified: true,
      },
    });
    userId = user.id;
    const otherUser = await prisma.user.create({
      data: {
        name: 'Other Receipt Test User',
        email: otherEmail,
        passwordHash: 'not-used-by-this-test',
        isVerified: true,
      },
    });
    otherUserId = otherUser.id;
    const category = await prisma.category.create({
      data: { name: `Receipt category ${suffix}`, userId: user.id },
    });
    const otherCategory = await prisma.category.create({
      data: { name: `Other receipt category ${suffix}`, userId: otherUser.id },
    });

    const [temporaryReceipt, otherReceipt, expiredReceipt] = await Promise.all([
      prisma.receipt.create({
        data: { userId: user.id, fileUrl: '/receipt-file', ocrStatus: 'FAILED' },
      }),
      prisma.receipt.create({
        data: { userId: otherUser.id, fileUrl: '/other-receipt-file' },
      }),
      prisma.receipt.create({
        data: {
          userId: user.id,
          fileUrl: '/expired-receipt-file',
          uploadedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        },
      }),
    ]);
    createdReceiptIds.push(temporaryReceipt.id, otherReceipt.id, expiredReceipt.id);

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
    const baseUrl = `http://127.0.0.1:${address.port}/api/v1/receipts`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const unauthenticated = await fetch(`${baseUrl}/${temporaryReceipt.id}`);
    assert.equal(unauthenticated.status, 401);

    const ownMetadata = await fetch(`${baseUrl}/${temporaryReceipt.id}`, { headers });
    assert.equal(ownMetadata.status, 200);
    assert.equal((await ownMetadata.json() as { id: string }).id, temporaryReceipt.id);

    const otherUserMetadata = await fetch(`${baseUrl}/${temporaryReceipt.id}`, {
      headers: { Authorization: `Bearer ${otherToken}` },
    });
    assert.equal(otherUserMetadata.status, 404);

    const invalidCategory = await fetch(`${baseUrl}/confirm`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        receiptId: temporaryReceipt.id,
        title: 'Receipt expense',
        amount: 25.75,
        date: '2026-06-08',
        categoryId: otherCategory.id,
        paymentMethod: 'CASH',
      }),
    });
    assert.equal(invalidCategory.status, 400);

    const otherUserConfirmation = await fetch(`${baseUrl}/confirm`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        receiptId: otherReceipt.id,
        title: 'Other receipt expense',
        amount: 25.75,
        date: '2026-06-08',
        categoryId: category.id,
        paymentMethod: 'CASH',
      }),
    });
    assert.equal(otherUserConfirmation.status, 404);

    const invalidAmount = await fetch(`${baseUrl}/confirm`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        receiptId: temporaryReceipt.id,
        title: 'Invalid receipt expense',
        amount: -1,
        date: '2026-06-08',
        categoryId: category.id,
        paymentMethod: 'CASH',
      }),
    });
    assert.equal(invalidAmount.status, 400);

    const expiredConfirmation = await fetch(`${baseUrl}/confirm`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        receiptId: expiredReceipt.id,
        title: 'Expired receipt expense',
        amount: 25.75,
        date: '2026-06-08',
        categoryId: category.id,
        paymentMethod: 'CASH',
      }),
    });
    assert.equal(expiredConfirmation.status, 410);

    const confirmation = await fetch(`${baseUrl}/confirm`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        receiptId: temporaryReceipt.id,
        title: 'Confirmed receipt expense',
        amount: 25.75,
        date: '2026-06-08',
        categoryId: category.id,
        paymentMethod: 'CASH',
        description: 'Integration test',
      }),
    });
    assert.equal(confirmation.status, 201);
    const confirmed = await confirmation.json() as {
      expense: { id: string; userId: string; amount: number };
      receipt: { id: string; expenseId: string | null };
    };
    assert.equal(confirmed.expense.userId, user.id);
    assert.equal(confirmed.expense.amount, 25.75);
    assert.equal(confirmed.receipt.expenseId, confirmed.expense.id);

    const duplicateConfirmation = await fetch(`${baseUrl}/confirm`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        receiptId: temporaryReceipt.id,
        title: 'Duplicate expense',
        amount: 25.75,
        date: '2026-06-08',
        categoryId: category.id,
        paymentMethod: 'CASH',
      }),
    });
    assert.equal(duplicateConfirmation.status, 409);

    const deleteReceiptResponse = await fetch(`${baseUrl}/${temporaryReceipt.id}`, {
      method: 'DELETE',
      headers,
    });
    assert.equal(deleteReceiptResponse.status, 200);

    const retainedExpense = await prisma.expense.findFirst({
      where: { id: confirmed.expense.id, userId: user.id },
    });
    assert.ok(retainedExpense);
    assert.equal(
      await prisma.receipt.count({ where: { id: temporaryReceipt.id } }),
      0
    );
    assert.equal(
      await prisma.expense.count({ where: { userId: user.id } }),
      1
    );
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
    if (createdReceiptIds.length) {
      await prisma.receiptStorageCleanup.deleteMany({
        where: { storageKey: { in: createdReceiptIds.map((id) => `legacy:${id}`) } },
      });
    }
    await prisma.user.deleteMany({
      where: { email: { in: [email, otherEmail] } },
    });
    if (otherUserId) {
      await prisma.category.deleteMany({ where: { userId: otherUserId } });
    }
    await prisma.$disconnect();
  }
});
