import { app } from '../app';
import { dbStore } from '../data/store';
import http from 'http';

describe('Auth & RBAC Integration Tests (FR-01, FR-03, FR-34, FR-38)', () => {
  let server: http.Server;
  let port: number;
  let baseUrl: string;

  beforeAll((done) => {
    dbStore.init();
    server = app.listen(0, () => {
      const addr = server.address() as any;
      port = addr.port;
      baseUrl = `http://127.0.0.1:${port}/api/v1`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  test('POST /auth/login with valid demo credentials returns 200 and JWT access token', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo@expenseai.local',
        password: 'Demo123!',
      }),
    });

    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.accessToken).toBeDefined();
    expect(data.user.email).toBe('demo@expenseai.local');
    expect(data.user.role).toBe('USER');
  });

  test('POST /auth/login with wrong password returns 401 generic error', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo@expenseai.local',
        password: 'WrongPassword999!',
      }),
    });

    expect(res.status).toBe(401);
    const data: any = await res.json();
    expect(data.error).toContain('Invalid email or password');
  });

  test('Regular user accessing admin endpoint receives 403 Forbidden (FR-34)', async () => {
    // 1. Login as regular user
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo@expenseai.local',
        password: 'Demo123!',
      }),
    });
    const { accessToken } = await loginRes.json() as any;

    // 2. Attempt to query admin stats
    const adminRes = await fetch(`${baseUrl}/admin/stats`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(adminRes.status).toBe(403);
    const data: any = await adminRes.json();
    expect(data.error).toContain('Administrator privileges required');
  });

  test('Admin endpoint returns platform aggregates and NEVER exposes individual users transactions (FR-38)', async () => {
    // 1. Login as admin
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@expenseai.local',
        password: 'Admin123!',
      }),
    });
    const { accessToken } = await loginRes.json() as any;

    // 2. Query admin stats
    const statsRes = await fetch(`${baseUrl}/admin/stats`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(statsRes.status).toBe(200);
    const stats: any = await statsRes.json();
    expect(stats.totalUsers).toBeGreaterThanOrEqual(2);
    expect(stats.ocrSuccessRate).toBe(91.4);
    // Verify privacy: no transaction rows or receipt files in payload
    expect(stats.transactions).toBeUndefined();
    expect(stats.receipts).toBeUndefined();
    expect(stats.expenses).toBeUndefined();
  });
});
