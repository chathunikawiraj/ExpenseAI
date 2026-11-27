const loopbackHosts = new Set(['127.0.0.1', '::1', '[::1]', 'localhost']);

export const assertSafeTestDatabase = (
  databaseUrl = process.env.DATABASE_URL,
  testDatabaseUrl = process.env.TEST_DATABASE_URL,
  directUrl = process.env.DIRECT_URL,
): void => {
  if (!databaseUrl || !testDatabaseUrl || databaseUrl !== testDatabaseUrl) {
    throw new Error(
      'Database integration tests require DATABASE_URL to exactly match TEST_DATABASE_URL.',
    );
  }

  if (directUrl && directUrl !== testDatabaseUrl) {
    throw new Error(
      'Database integration tests require DIRECT_URL to exactly match TEST_DATABASE_URL.',
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error('Database integration tests require a valid PostgreSQL test URL.');
  }

  if (
    !['postgres:', 'postgresql:'].includes(parsedUrl.protocol) ||
    !loopbackHosts.has(parsedUrl.hostname.toLowerCase())
  ) {
    throw new Error(
      'Database integration tests are restricted to a local PostgreSQL test database.',
    );
  }

  const databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ''));
  if (!/(^|_)test($|_)/i.test(databaseName)) {
    throw new Error(
      'Database integration tests require a database name containing the standalone word "test".',
    );
  }
};
