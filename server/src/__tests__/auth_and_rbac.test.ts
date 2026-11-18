import http from 'http';
import * as emailService from '../services/email.service';
import { app } from '../app';
import { prisma } from '../config/prisma';
import { dbStore } from '../data/store';
import { hashPassword } from '../utils/hash';

describe('Authentication and RBAC endpoints', () => {
  let server: http.Server;
  let baseUrl: string;
  let registeredEmail: string;
  let existingEmail: string;
  let adminEmail: string;
  let verificationToken: string | null = null;
  let passwordResetToken: string | null = null;

  beforeAll(async () => {
    dbStore.init();
    const suffix = `${process.pid}_${Date.now()}`;
    registeredEmail = `auth.register.${suffix}@example.test`;
    existingEmail = `auth.existing.${suffix}@example.test`;
    adminEmail = `auth.admin.${suffix}@example.test`;

    jest.spyOn(emailService, 'sendVerificationEmail').mockImplementation(async (_email, url) => {
      verificationToken = new URL(url).searchParams.get('token');
    });
    jest.spyOn(emailService, 'sendPasswordResetEmail').mockImplementation(async (_email, url) => {
      passwordResetToken = new URL(url).searchParams.get('token');
    });

    await prisma.user.create({
      data: {
        email: existingEmail,
        name: 'Existing Test User',
        passwordHash: await hashPassword('SecurePass123'),
        isVerified: true,
      },
    });
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Test Admin',
        passwordHash: await hashPassword('SecurePass123'),
        role: 'ADMIN',
        isVerified: true,
      },
    });

    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port.');
    baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    }

    await prisma.user.deleteMany({
      where: { email: { in: [registeredEmail, existingEmail, adminEmail] } },
    });
    jest.restoreAllMocks();
  });

  const post = (path: string, body: unknown, cookie?: string) =>
    fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify(body),
    });

  const cookieValue = (response: Response): string => {
    const cookie = response.headers.get('set-cookie');
    if (!cookie) throw new Error('Expected the response to set a refresh cookie.');
    return cookie.split(';')[0];
  };

  test('validates registration, verifies email once, and issues authenticated access', async () => {
    const invalid = await post('/auth/register', {
      name: '',
      email: 'not-an-email',
      password: 'short',
    });
    expect(invalid.status).toBe(400);

    const duplicate = await post('/auth/register', {
      name: 'Duplicate',
      email: existingEmail,
      password: 'SecurePass123',
    });
    expect(duplicate.status).toBe(409);

    const registration = await post('/auth/register', {
      name: 'Registered User',
      email: registeredEmail.toUpperCase(),
      password: 'SecurePass123',
      currency: 'eur',
      monthlyIncome: 2500,
    });
    expect(registration.status).toBe(201);
    const registrationData = await registration.json() as any;
    expect(registrationData.requiresEmailVerification).toBe(true);
    expect(registrationData.accessToken).toBeUndefined();
    expect(registrationData.user.email).toBe(registeredEmail);
    expect(verificationToken).toBeTruthy();

    const unverifiedLogin = await post('/auth/login', {
      email: registeredEmail,
      password: 'SecurePass123',
    });
    expect(unverifiedLogin.status).toBe(403);

    const verification = await post('/auth/verify-email', { token: verificationToken });
    expect(verification.status).toBe(200);
    const replay = await post('/auth/verify-email', { token: verificationToken });
    expect(replay.status).toBe(400);

    const login = await post('/auth/login', {
      email: registeredEmail,
      password: 'SecurePass123',
    });
    expect(login.status).toBe(200);
    const loginData = await login.json() as any;
    expect(loginData.accessToken).toBeTruthy();
    expect(loginData.user.currency).toBe('EUR');
    expect(loginData.user.monthlyIncome).toBe(2500);

    const profile = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${loginData.accessToken}` },
    });
    expect(profile.status).toBe(200);
    expect((await profile.json() as any).email).toBe(registeredEmail);
  });

  test('rotates refresh tokens, revokes logout, and denies invalid credentials', async () => {
    const wrongPassword = await post('/auth/login', {
      email: registeredEmail,
      password: 'WrongPassword123',
    });
    expect(wrongPassword.status).toBe(401);

    const login = await post('/auth/login', {
      email: registeredEmail,
      password: 'SecurePass123',
    });
    const originalCookie = cookieValue(login);

    const refresh = await post('/auth/refresh', {}, originalCookie);
    expect(refresh.status).toBe(200);
    expect(cookieValue(refresh)).not.toBe(originalCookie);
    expect((await refresh.json() as any).accessToken).toBeTruthy();

    const replay = await post('/auth/refresh', {}, originalCookie);
    expect(replay.status).toBe(401);

    const rotatedCookie = cookieValue(refresh);
    const logout = await post('/auth/logout', {}, rotatedCookie);
    expect(logout.status).toBe(200);
    const afterLogout = await post('/auth/refresh', {}, rotatedCookie);
    expect(afterLogout.status).toBe(401);
  });

  test('resets password once and revokes existing refresh sessions', async () => {
    const login = await post('/auth/login', {
      email: registeredEmail,
      password: 'SecurePass123',
    });
    const oldCookie = cookieValue(login);

    const forgot = await post('/auth/forgot-password', { email: registeredEmail });
    expect(forgot.status).toBe(200);
    expect(passwordResetToken).toBeTruthy();

    const reset = await post('/auth/reset-password', {
      token: passwordResetToken,
      newPassword: 'NewSecurePass456',
    });
    expect(reset.status).toBe(200);

    const replay = await post('/auth/reset-password', {
      token: passwordResetToken,
      newPassword: 'AnotherSecure789',
    });
    expect(replay.status).toBe(400);

    const oldPasswordLogin = await post('/auth/login', {
      email: registeredEmail,
      password: 'SecurePass123',
    });
    expect(oldPasswordLogin.status).toBe(401);

    const newPasswordLogin = await post('/auth/login', {
      email: registeredEmail,
      password: 'NewSecurePass456',
    });
    expect(newPasswordLogin.status).toBe(200);

    const revokedRefresh = await post('/auth/refresh', {}, oldCookie);
    expect(revokedRefresh.status).toBe(401);
  });

  test('enforces role-based access and hides account existence for reset requests', async () => {
    const login = await post('/auth/login', {
      email: registeredEmail,
      password: 'NewSecurePass456',
    });
    const loginData = await login.json() as any;

    const forbidden = await fetch(`${baseUrl}/admin/stats`, {
      headers: { Authorization: `Bearer ${loginData.accessToken}` },
    });
    expect(forbidden.status).toBe(403);

    const adminLogin = await post('/auth/login', {
      email: adminEmail,
      password: 'SecurePass123',
    });
    const adminData = await adminLogin.json() as any;
    const stats = await fetch(`${baseUrl}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminData.accessToken}` },
    });
    expect(stats.status).toBe(200);
    const statsData = await stats.json() as any;
    expect(statsData.transactions).toBeUndefined();
    expect(statsData.receipts).toBeUndefined();
    expect(statsData.expenses).toBeUndefined();

    const unknownEmail = await post('/auth/forgot-password', { email: `missing.${Date.now()}@example.test` });
    const knownEmail = await post('/auth/forgot-password', { email: registeredEmail });
    expect(unknownEmail.status).toBe(200);
    expect(knownEmail.status).toBe(200);
    expect(await unknownEmail.json()).toEqual(await knownEmail.json());
  });
});
