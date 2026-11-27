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

test('savings goals, contribution history, and completion notifications are isolated and consistent', async () => {
  await prisma.$connect();

  const suffix = `${process.pid}.${Date.now()}`;
  const email = `savings-goals.${suffix}@example.test`;
  const otherEmail = `savings-goals.other.${suffix}@example.test`;
  let server: Server | undefined;

  try {
    const user = await prisma.user.create({
      data: {
        name: 'Savings Goal Test User',
        email,
        passwordHash: 'not-used-by-this-test',
        isVerified: true,
      },
    });
    const otherUser = await prisma.user.create({
      data: {
        name: 'Other Savings Goal Test User',
        email: otherEmail,
        passwordHash: 'not-used-by-this-test',
        isVerified: true,
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

    const createGoal = async (requestHeaders: typeof headers, body: object) => {
      const response = await fetch(`${base}/goals`, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(body),
      });
      return response;
    };
    const addContribution = async (
      goalId: string,
      body: { amount: number; date: string; note?: string }
    ) => fetch(`${base}/goals/${goalId}/contributions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const createResponse = await createGoal(headers, {
      name: 'Emergency fund',
      targetAmount: 100,
    });
    assert.equal(createResponse.status, 201);
    const created = await createResponse.json() as {
      id: string;
      savedAmount: number;
      remainingAmount: number;
      percentage: number;
      isCompleted: boolean;
      targetDate: string | null;
    };
    assert.equal(created.savedAmount, 0);
    assert.equal(created.remainingAmount, 100);
    assert.equal(created.percentage, 0);
    assert.equal(created.isCompleted, false);
    assert.equal(created.targetDate, null);

    const listResponse = await fetch(`${base}/goals`, { headers });
    assert.equal(listResponse.status, 200);
    assert.equal((await listResponse.json() as Array<{ id: string }>)[0].id, created.id);

    const readResponse = await fetch(`${base}/goals/${created.id}`, { headers });
    assert.equal(readResponse.status, 200);
    assert.equal((await readResponse.json() as { id: string }).id, created.id);
    assert.equal((await fetch(`${base}/goals/${created.id}`)).status, 401);
    assert.equal((await fetch(`${base}/goals/not-a-uuid`, { headers })).status, 400);
    assert.equal(
      (await fetch(`${base}/goals/not-a-uuid/contributions`, { headers })).status,
      400
    );

    const firstContribution = await addContribution(created.id, {
      amount: 50,
      date: '2026-11-20',
      note: 'Monthly savings',
    });
    assert.equal(firstContribution.status, 200);
    const afterFirst = await firstContribution.json() as {
      savedAmount: number;
      remainingAmount: number;
      percentage: number;
      isCompleted: boolean;
    };
    assert.equal(afterFirst.savedAmount, 50);
    assert.equal(afterFirst.remainingAmount, 50);
    assert.equal(afterFirst.percentage, 50);
    assert.equal(afterFirst.isCompleted, false);

    const secondContribution = await addContribution(created.id, {
      amount: 60,
      date: '2026-11-21',
      note: 'Bonus',
    });
    assert.equal(secondContribution.status, 200);
    const overTarget = await secondContribution.json() as {
      savedAmount: number;
      remainingAmount: number;
      percentage: number;
      isCompleted: boolean;
    };
    assert.equal(overTarget.savedAmount, 110);
    assert.equal(overTarget.remainingAmount, 0);
    assert.equal(overTarget.percentage, 100);
    assert.equal(overTarget.isCompleted, true);
    assert.equal(
      await prisma.notification.count({
        where: { userId: user.id, type: NotificationType.GOAL_COMPLETED },
      }),
      1
    );
    const listedAfterOvershoot = await fetch(`${base}/goals`, { headers })
      .then((response) => response.json() as Promise<Array<{ id: string; savedAmount: number; percentage: number; isCompleted: boolean }>>);
    const retrievedAfterOvershoot = await fetch(`${base}/goals/${created.id}`, { headers })
      .then((response) => response.json() as Promise<{ savedAmount: number; percentage: number; isCompleted: boolean }>);
    assert.equal(listedAfterOvershoot[0].savedAmount, retrievedAfterOvershoot.savedAmount);
    assert.equal(listedAfterOvershoot[0].percentage, retrievedAfterOvershoot.percentage);
    assert.equal(listedAfterOvershoot[0].isCompleted, retrievedAfterOvershoot.isCompleted);

    const thirdContribution = await addContribution(created.id, {
      amount: 5,
      date: '2026-11-22',
    });
    assert.equal(thirdContribution.status, 200);
    assert.equal(
      await prisma.notification.count({
        where: { userId: user.id, type: NotificationType.GOAL_COMPLETED },
      }),
      1
    );

    const historyResponse = await fetch(
      `${base}/goals/${created.id}/contributions?page=1&limit=2`,
      { headers }
    );
    assert.equal(historyResponse.status, 200);
    const history = await historyResponse.json() as {
      data: Array<{ amount: number; date: string; note: string | null }>;
      meta: { total: number; page: number; limit: number; totalPages: number };
    };
    assert.equal(history.meta.total, 3);
    assert.equal(history.meta.totalPages, 2);
    assert.deepEqual(history.data.map((item) => item.date), ['2026-11-22', '2026-11-21']);
    assert.equal(history.data[0].amount, 5);
    assert.equal(history.data[1].note, 'Bonus');

    const targetUpdate = await fetch(`${base}/goals/${created.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        name: 'Emergency reserve',
        targetAmount: 200,
        targetDate: '2027-12-31',
      }),
    });
    assert.equal(targetUpdate.status, 200);
    const updated = await targetUpdate.json() as {
      name: string;
      targetAmount: number;
      savedAmount: number;
      remainingAmount: number;
      percentage: number;
      isCompleted: boolean;
      targetDate: string;
    };
    assert.equal(updated.name, 'Emergency reserve');
    assert.equal(updated.targetAmount, 200);
    assert.equal(updated.savedAmount, 115);
    assert.equal(updated.remainingAmount, 85);
    assert.equal(updated.percentage, 57.5);
    assert.equal(updated.isCompleted, false);
    assert.equal(updated.targetDate, '2027-12-31');
    assert.equal(await prisma.savingsContribution.count({ where: { goalId: created.id } }), 3);

    const completionAgain = await addContribution(created.id, {
      amount: 85,
      date: '2026-11-23',
    });
    assert.equal(completionAgain.status, 200);
    assert.equal(
      await prisma.notification.count({
        where: { userId: user.id, type: NotificationType.GOAL_COMPLETED },
      }),
      2
    );
    assert.equal(
      await prisma.notification.count({
        where: { userId: user.id, type: NotificationType.SAVINGS_UPDATE },
      }),
      4
    );

    const invalidAmount = await addContribution(created.id, {
      amount: 1.001,
      date: '2026-11-24',
    });
    assert.equal(invalidAmount.status, 400);
    const invalidDate = await addContribution(created.id, {
      amount: 1,
      date: '2026-02-30',
    });
    assert.equal(invalidDate.status, 400);
    assert.equal(
      await fetch(`${base}/goals/${created.id}/contributions?limit=101`, { headers })
        .then((response) => response.status),
      400
    );

    const foreignGoal = await createGoal(otherHeaders, {
      name: 'Private savings',
      targetAmount: 300,
    });
    assert.equal(foreignGoal.status, 201);
    const foreign = await foreignGoal.json() as { id: string };
    const ownGoalList = await fetch(`${base}/goals`, { headers })
      .then((response) => response.json() as Promise<Array<{ id: string }>>);
    const otherGoalList = await fetch(`${base}/goals`, { headers: otherHeaders })
      .then((response) => response.json() as Promise<Array<{ id: string }>>);
    assert.ok(ownGoalList.some(({ id }) => id === created.id));
    assert.equal(ownGoalList.some(({ id }) => id === foreign.id), false);
    assert.deepEqual(otherGoalList.map(({ id }) => id), [foreign.id]);
    assert.equal((await fetch(`${base}/goals/${foreign.id}`, { headers })).status, 404);
    assert.equal(
      (await fetch(`${base}/goals/${foreign.id}/contributions`, { headers })).status,
      404
    );
    assert.equal(
      (await fetch(`${base}/goals/${foreign.id}/contributions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ amount: 10, date: '2026-11-24' }),
      })).status,
      404
    );
    assert.equal(
      (await fetch(`${base}/goals/${foreign.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ targetAmount: 400 }),
      })).status,
      404
    );
    assert.equal(
      (await fetch(`${base}/goals/${foreign.id}`, {
        method: 'DELETE',
        headers,
      })).status,
      404
    );
    assert.equal(await prisma.notification.count({ where: { userId: otherUser.id } }), 0);

    const deleteResponse = await fetch(`${base}/goals/${created.id}`, {
      method: 'DELETE',
      headers,
    });
    assert.equal(deleteResponse.status, 200);
    assert.equal((await fetch(`${base}/goals/${created.id}`, { headers })).status, 404);
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
