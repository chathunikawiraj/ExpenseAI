CREATE TYPE "ReceiptStorageProvider" AS ENUM ('LOCAL', 'CLOUDINARY');

ALTER TABLE "Receipt"
ADD COLUMN "storageProvider" "ReceiptStorageProvider" NOT NULL DEFAULT 'LOCAL',
ADD COLUMN "storageKey" TEXT,
ADD COLUMN "storageFormat" TEXT;

CREATE TABLE "ReceiptStorageCleanup" (
    "id" UUID NOT NULL,
    "provider" "ReceiptStorageProvider" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageFormat" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptStorageCleanup_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReceiptStorageCleanup_availableAt_createdAt_idx"
ON "ReceiptStorageCleanup"("availableAt", "createdAt");
