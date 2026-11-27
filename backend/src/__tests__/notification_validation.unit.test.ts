import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Request, Response } from 'express';
import {
  readNotification,
  removeNotification,
} from '../controllers/notifications.controller.js';
import { notificationIdSchema } from '../validators/notification.validator.js';

test('notification IDs must be UUIDs before reaching Prisma', () => {
  assert.equal(
    notificationIdSchema.safeParse('4a0f4ba2-f55d-47da-99ba-65e6a3c7942d').success,
    true
  );
  for (const id of ['not-a-uuid', '', '123']) {
    assert.equal(notificationIdSchema.safeParse(id).success, false, id);
  }
});

test('notification controllers reject malformed IDs before database access', async () => {
  for (const handler of [readNotification, removeNotification]) {
    let statusCode = 0;
    let responseBody: unknown;
    const request = {
      params: { id: 'not-a-uuid' },
      authUser: {
        userId: '4a0f4ba2-f55d-47da-99ba-65e6a3c7942d',
        email: 'user@example.test',
        role: 'USER',
      },
    } as unknown as Request;
    const response = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: unknown) {
        responseBody = body;
        return this;
      },
    } as unknown as Response;

    await handler(request, response, () => undefined);
    assert.equal(statusCode, 400);
    assert.deepEqual(responseBody, { error: 'Notification ID must be a valid UUID.' });
  }
});
