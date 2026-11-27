import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.middleware.js';

test('body validation never logs submitted values and still returns validation errors', () => {
  const originalLog = console.log;
  let logged = false;
  console.log = () => {
    logged = true;
  };

  try {
    const schema = z.object({ email: z.string().email(), password: z.string().min(8) }).strict();
    const validRequest = {
      headers: { 'content-type': 'application/json' },
      body: { email: 'private@example.test', password: 'secret-password' },
    } as unknown as Request;
    let nextCalled = false;
    validateBody(schema)(validRequest, {} as Response, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.deepEqual(validRequest.body, {
      email: 'private@example.test',
      password: 'secret-password',
    });

    let statusCode = 0;
    let responseBody: unknown;
    const invalidRequest = {
      headers: { 'content-type': 'application/json' },
      body: { email: 'private@example.test', password: 'short' },
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
    let invalidNextCalled = false;
    validateBody(schema)(invalidRequest, response, () => {
      invalidNextCalled = true;
    });

    assert.equal(statusCode, 400);
    assert.equal(invalidNextCalled, false);
    assert.ok(responseBody);
    assert.equal(logged, false);
  } finally {
    console.log = originalLog;
  }
});
