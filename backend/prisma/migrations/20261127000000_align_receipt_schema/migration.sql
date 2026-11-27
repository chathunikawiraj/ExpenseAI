ALTER TABLE "Receipt"
ADD COLUMN "userId" UUID;

UPDATE "Receipt" AS receipt
SET "userId" = expense."userId"
FROM "Expense" AS expense
WHERE receipt."expenseId" = expense."id";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Receipt" WHERE "userId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot assign an owner to every existing receipt';
  END IF;
END $$;

ALTER TABLE "Receipt"
ALTER COLUMN "userId" SET NOT NULL,
ALTER COLUMN "expenseId" DROP NOT NULL;

CREATE INDEX "Receipt_userId_idx" ON "Receipt"("userId");

ALTER TABLE "Receipt"
ADD CONSTRAINT "Receipt_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
