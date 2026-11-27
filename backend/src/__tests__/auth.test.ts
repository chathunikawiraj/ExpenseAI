import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import { assertSafeTestDatabase } from '../test-utils/testDatabaseGuard.js';
import app from '../app.js';
import prisma from '../config/database.js';
import { env } from '../config/env.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { hashToken } from '../utils/authTokens.js';

assertSafeTestDatabase();

test('registration, email verification, login, refresh, reset, and authorization', async () => {
  await prisma.$connect();

  const email = `auth.${process.pid}.${Date.now()}@example.test`;
  const userPassword = 'TestUser123';
  const links: string[] = [];
  const originalInfo = console.info;
  let changedEmail: string | undefined;
  const originalNodeEnv = env.NODE_ENV;
  console.info = (...values: unknown[]) => {
    const message = values.join(' ');
    const url = message.match(/https?:\/\/\S+/)?.[0];
    if (url) links.push(url);
  };

  let server: http.Server | undefined;
  let roleServer: http.Server | undefined;
  try {
    env.NODE_ENV = 'test';
    const apiServer = app.listen(0);
    server = apiServer;
    await new Promise<void>((resolve) => apiServer.once('listening', resolve));
    const apiAddress = apiServer.address();
    assert.ok(apiAddress && typeof apiAddress !== 'string');
    const baseUrl = `http://127.0.0.1:${apiAddress.port}/api/v1/auth`;

    const invalidRegistration = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email, password: 'short' }),
    });
    assert.equal(invalidRegistration.status, 400);

    const registration = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email, password: userPassword, currency: 'USD' }),
    });
    assert.equal(registration.status, 201);
    const registrationData = await registration.json() as { user: { email: string; isVerified: boolean }; accessToken?: string };
    assert.equal(registrationData.user.email, email);
    assert.equal(registrationData.user.isVerified, false);
    assert.equal(registrationData.accessToken, undefined);
    assert.equal(links.length, 1);

    const duplicateRegistration = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email: email.toUpperCase(), password: userPassword }),
    });
    assert.equal(duplicateRegistration.status, 409);

    const unverifiedLogin = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: userPassword }),
    });
    assert.equal(unverifiedLogin.status, 403);

    const verificationToken = new URL(links[0]).searchParams.get('token');
    assert.ok(verificationToken);
    const verification = await fetch(`${baseUrl}/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: verificationToken }),
    });
    assert.equal(verification.status, 200);
    const replayVerification = await fetch(`${baseUrl}/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: verificationToken }),
    });
    assert.equal(replayVerification.status, 400);

    const login = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: userPassword }),
    });
    assert.equal(login.status, 200);
    const session = await login.json() as { accessToken: string; user: { id: string } };
    const initialCookie = login.headers.get('set-cookie')?.split(';')[0];
    assert.ok(initialCookie);
    const loginCookieHeader = login.headers.get('set-cookie') ?? '';
    assert.match(loginCookieHeader, /HttpOnly/i);
    assert.match(loginCookieHeader, /SameSite=Lax/i);
    assert.match(loginCookieHeader, /Path=\/api\/v1\/auth/i);
    assert.match(loginCookieHeader, /Max-Age=604800/i);
    const refreshToken = initialCookie.slice('refreshToken='.length);
    const storedRefreshToken = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
    });
    assert.ok(storedRefreshToken);
    assert.notEqual(storedRefreshToken.tokenHash, refreshToken);

    const profile = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    assert.equal(profile.status, 200);

    const invalidTokenProfile = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: 'Bearer invalid-token' },
    });
    assert.equal(invalidTokenProfile.status, 401);

    const expiredAccessToken = jwt.sign(
      {
        userId: session.user.id,
        email,
        role: 'USER',
        tokenType: 'access',
      },
      env.JWT_SECRET,
      { expiresIn: '-1s' },
    );
    const expiredTokenProfile = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${expiredAccessToken}` },
    });
    assert.equal(expiredTokenProfile.status, 401);

    const roleApp = express();
    roleApp.get('/admin', authenticate, requireRole('ADMIN'), (_req, res) => res.sendStatus(204));
    roleApp.use(errorHandler);
    const testRoleServer = roleApp.listen(0);
    roleServer = testRoleServer;
    await new Promise<void>((resolve) => testRoleServer.once('listening', resolve));
    const roleAddress = testRoleServer.address();
    assert.ok(roleAddress && typeof roleAddress !== 'string');
    const forbidden = await fetch(`http://127.0.0.1:${roleAddress.port}/admin`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    assert.equal(forbidden.status, 403);

    const refresh = await fetch(`${baseUrl}/refresh`, {
      method: 'POST',
      headers: { Cookie: initialCookie },
    });
    assert.equal(refresh.status, 200);
    const rotatedCookie = refresh.headers.get('set-cookie')?.split(';')[0];
    assert.ok(rotatedCookie);
    assert.notEqual(rotatedCookie, initialCookie);

    const replayRefresh = await fetch(`${baseUrl}/refresh`, {
      method: 'POST',
      headers: { Cookie: initialCookie },
    });
    assert.equal(replayRefresh.status, 401);

    const logout = await fetch(`${baseUrl}/logout`, {
      method: 'POST',
      headers: { Cookie: rotatedCookie },
    });
    assert.equal(logout.status, 200);
    const refreshAfterLogout = await fetch(`${baseUrl}/refresh`, {
      method: 'POST',
      headers: { Cookie: rotatedCookie },
    });
    assert.equal(refreshAfterLogout.status, 401);

    const activeSession = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: userPassword }),
    });
    const resetRevocationCookie = activeSession.headers.get('set-cookie')?.split(';')[0];
    assert.ok(resetRevocationCookie);

    const resetRequest = await fetch(`${baseUrl}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    assert.equal(resetRequest.status, 200);
    const resetToken = new URL(links[1]).searchParams.get('token');
    assert.ok(resetToken);

    const reset = await fetch(`${baseUrl}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, newPassword: 'NewTestUser456' }),
    });
    assert.equal(reset.status, 200);

    const refreshAfterReset = await fetch(`${baseUrl}/refresh`, {
      method: 'POST',
      headers: { Cookie: resetRevocationCookie },
    });
    assert.equal(refreshAfterReset.status, 401);

    const replayReset = await fetch(`${baseUrl}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, newPassword: 'AnotherPass789' }),
    });
    assert.equal(replayReset.status, 400);

    const oldPasswordLogin = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: userPassword }),
    });
    assert.equal(oldPasswordLogin.status, 401);

    const newPasswordLogin = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'NewTestUser456' }),
    });
    assert.equal(newPasswordLogin.status, 200);

    const unknownEmailRequest = await fetch(`${baseUrl}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `missing.${Date.now()}@example.test` }),
    });
    assert.equal(unknownEmailRequest.status, 200);
    assert.deepEqual(await unknownEmailRequest.json(), await resetRequest.json());

    changedEmail = `profile.${process.pid}.${Date.now()}@example.test`;
    const profileUpdate = await fetch(`${baseUrl}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await newPasswordLogin.json() as { accessToken: string }).accessToken}`,
      },
      body: JSON.stringify({
        name: 'Updated Test User',
        email: changedEmail,
        monthlyIncome: 4200,
        currency: 'usd',
      }),
    });
    assert.equal(profileUpdate.status, 200);
    const updatedProfile = await profileUpdate.json() as {
      user: { name: string; email: string; monthlyIncome: number; currency: string; isVerified: boolean };
    };
    assert.equal(updatedProfile.user.name, 'Updated Test User');
    assert.equal(updatedProfile.user.email, changedEmail);
    assert.equal(updatedProfile.user.monthlyIncome, 4200);
    assert.equal(updatedProfile.user.currency, 'USD');
    assert.equal(updatedProfile.user.isVerified, false);

    const changedEmailVerificationToken = new URL(links[2]).searchParams.get('token');
    assert.ok(changedEmailVerificationToken);
    const changedEmailVerification = await fetch(`${baseUrl}/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: changedEmailVerificationToken }),
    });
    assert.equal(changedEmailVerification.status, 200);

    const changedEmailLogin = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: changedEmail, password: 'NewTestUser456' }),
    });
    assert.equal(changedEmailLogin.status, 200);
  } finally {
    console.info = originalInfo;
    env.NODE_ENV = originalNodeEnv;
    if (roleServer) await new Promise<void>((resolve, reject) => {
      roleServer?.close((error) => error ? reject(error) : resolve());
    });
    if (server) await new Promise<void>((resolve, reject) => {
      server?.close((error) => error ? reject(error) : resolve());
    });
    await prisma.user.deleteMany({
      where: { email: { in: [email, ...(changedEmail ? [changedEmail] : [])] } },
    });
    await prisma.$disconnect();
  }
});
