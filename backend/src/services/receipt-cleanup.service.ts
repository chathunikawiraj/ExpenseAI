import { Prisma } from '@prisma/client';
import type { Prisma as PrismaNamespace } from '@prisma/client';
import prisma from '../config/database';
import { deleteReceiptObject } from './receipt-storage.service';

export const TEMPORARY_RECEIPT_TTL_MS = 24 * 60 * 60 * 1000;
const CLEANUP_BATCH_SIZE = 25;

type ReceiptStorageCleanupClient = PrismaNamespace.TransactionClient;

interface ReceiptStorageReference {
  id: string;
  storageProvider: 'LOCAL' | 'CLOUDINARY';
  storageKey: string | null;
  storageFormat: string | null;
}

export const enqueueReceiptStorageCleanup = async (
  transaction: ReceiptStorageCleanupClient,
  receipt: ReceiptStorageReference
) => {
  await transaction.receiptStorageCleanup.create({
    data: {
      provider: receipt.storageProvider,
      storageKey: receipt.storageKey ?? `legacy:${receipt.id}`,
      storageFormat: receipt.storageFormat,
    },
  });
};

const expireTemporaryReceipts = async () => {
  const uploadedBefore = new Date(Date.now() - TEMPORARY_RECEIPT_TTL_MS);
  await prisma.$transaction(async (transaction) => {
    const expired = await transaction.receipt.findMany({
      where: {
        expenseId: null,
        uploadedAt: { lt: uploadedBefore },
      },
      orderBy: { uploadedAt: 'asc' },
      take: CLEANUP_BATCH_SIZE,
    });

    for (const receipt of expired) {
      await enqueueReceiptStorageCleanup(transaction, receipt);
    }

    if (expired.length) {
      await transaction.receipt.deleteMany({
        where: { id: { in: expired.map(({ id }) => id) }, expenseId: null },
      });
    }
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
};

const retryDelay = (attempts: number) =>
  Math.min(60 * 60 * 1000, 5_000 * (2 ** Math.min(attempts, 9)));

const processStorageCleanupQueue = async () => {
  const items = await prisma.receiptStorageCleanup.findMany({
    where: { availableAt: { lte: new Date() } },
    orderBy: [{ availableAt: 'asc' }, { createdAt: 'asc' }],
    take: CLEANUP_BATCH_SIZE,
  });

  for (const item of items) {
    try {
      await deleteReceiptObject(item.provider, item.storageKey, item.storageFormat);
      await prisma.receiptStorageCleanup.deleteMany({ where: { id: item.id } });
    } catch (error) {
      const attempts = item.attempts + 1;
      console.error('[ExpenseAI receipt cleanup] Storage deletion will be retried:', error);
      await prisma.receiptStorageCleanup.updateMany({
        where: { id: item.id },
        data: {
          attempts,
          availableAt: new Date(Date.now() + retryDelay(attempts)),
        },
      });
    }
  }
};

export const runReceiptCleanupCycle = async () => {
  await expireTemporaryReceipts();
  await processStorageCleanupQueue();
};

export const drainReceiptStorageCleanupQueue = processStorageCleanupQueue;

export const legacyReceiptStorageKey = (receiptId: string) => `legacy:${receiptId}`;
