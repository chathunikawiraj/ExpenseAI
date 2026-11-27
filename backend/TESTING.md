# Backend testing

## Database-backed tests

Integration tests create and delete records, so run them only against a disposable PostgreSQL database. They refuse to start unless `DATABASE_URL` exactly matches `TEST_DATABASE_URL`, the URL targets loopback, the database name includes the standalone word `test`, and any `DIRECT_URL` matches as well. Never point these variables at development, staging, or production.

The following PowerShell example creates a temporary local database with no persistent Docker volume. Use a disposable password and keep all commands in the same PowerShell session:

```powershell
$env:TEST_DB_PASSWORD = 'replace-with-a-disposable-password'
docker run --rm --name expenseai-task6-test-db `
  -e POSTGRES_USER=expenseai_test `
  -e POSTGRES_PASSWORD=$env:TEST_DB_PASSWORD `
  -e POSTGRES_DB=expenseai_task6_test `
  -p 127.0.0.1:55432:5432 `
  --tmpfs /var/lib/postgresql/data:rw,noexec,nosuid,size=1g `
  postgres:16-alpine
```

Run the container in a separate terminal. In the terminal used for Prisma and tests, configure and verify the target without printing its credentials:

```powershell
$testUrl = "postgresql://expenseai_test:$($env:TEST_DB_PASSWORD)@127.0.0.1:55432/expenseai_task6_test?schema=public"
$env:TEST_DATABASE_URL = $testUrl
$env:DATABASE_URL = $testUrl
$env:DIRECT_URL = $testUrl
$env:NODE_ENV = 'test'
$parsed = [Uri]$env:TEST_DATABASE_URL
if ($parsed.Host -ne '127.0.0.1' -or $parsed.Port -ne 55432 -or $parsed.AbsolutePath -ne '/expenseai_task6_test') {
  throw 'Refusing to use a database other than the dedicated local Task 6 test database.'
}
Write-Output "Verified test database target: host=$($parsed.Host), port=$($parsed.Port), database=$($parsed.AbsolutePath.TrimStart('/'))"
```

Apply migrations only after verifying that target, then run the test suites:

```powershell
npx prisma migrate deploy
npm run test:unit
npm run test:integration
```

The database-backed tests can also be run together with `npm test`; the same connection guard applies. Stop the disposable container when finished. Do not use the root development Compose database for tests because it has persistent storage.

## Test commands

- `npm run test:unit` runs database-independent tests.
- `npm run test:integration` runs database-backed HTTP integration tests and requires the guarded disposable test database above.
- `npm test` runs both groups and therefore also requires the guarded test database.
