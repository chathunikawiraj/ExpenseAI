import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

test('refresh tokens remain unique when issued within the same second', () => {
  const payload = {
    userId: '4b9e1d21-7d6a-4a80-86d5-cf2ab15a8061',
    email: 'refresh-token@example.test',
    role: 'USER' as const,
  };

  const firstToken = signRefreshToken(payload);
  const secondToken = signRefreshToken(payload);

  assert.notEqual(firstToken, secondToken);
  assert.deepEqual(verifyRefreshToken(firstToken), payload);
  assert.deepEqual(verifyRefreshToken(secondToken), payload);
});
