import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateReceiptSchema() {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Receipt" ADD COLUMN IF NOT EXISTS "userId" UUID'
  );
  await prisma.$executeRawUnsafe(
    'UPDATE "Receipt" r SET "userId" = e."userId" FROM "Expense" e WHERE r."expenseId" = e."id"'
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Receipt" ALTER COLUMN "expenseId" DROP NOT NULL'
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Receipt" ALTER COLUMN "userId" SET NOT NULL'
  );
  await prisma.$executeRawUnsafe(
    `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Receipt_userId_fkey'
      ) THEN
        ALTER TABLE "Receipt"
        ADD CONSTRAINT "Receipt_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$`
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "Receipt_userId_idx" ON "Receipt"("userId")'
  );
  await prisma.$disconnect();
  console.log('Receipt schema updated.');
}

updateReceiptSchema().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
