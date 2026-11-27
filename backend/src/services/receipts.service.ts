import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { CreateExpenseInput } from '../validators/expense.validator';
import prisma from '../config/database';
import { AuthError } from './auth.service';
import {
  drainReceiptStorageCleanupQueue,
  enqueueReceiptStorageCleanup,
  TEMPORARY_RECEIPT_TTL_MS,
} from './receipt-cleanup.service';
import { validateReceiptImage } from './receipt-file-validation.service';
import { parseReceiptText } from './receipt-parser.service';
import { recognizeReceipt } from './receipt-ocr.service';
import {
  createReceiptViewUrl,
  deleteReceiptObject,
  getLocalReceiptPath,
  uploadReceiptObject,
} from './receipt-storage.service';
import type { StoredReceiptObject } from './receipt-storage.service';
import { createExpenseWithReceipt } from './expense.service';

const receiptFileUrl = (receiptId: string) => `/api/v1/receipts/${receiptId}/file`;

const toReceiptResponse = (receipt: {
  id: string;
  expenseId: string | null;
  fileUrl: string;
  ocrVendor: string | null;
  ocrDate: Date | null;
  ocrAmount: Prisma.Decimal | null;
  ocrStatus: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  uploadedAt: Date;
}) => ({
  id: receipt.id,
  receiptId: receipt.id,
  expenseId: receipt.expenseId,
  fileUrl: receipt.fileUrl,
  ocrVendor: receipt.ocrVendor,
  ocrDate: receipt.ocrDate?.toISOString().slice(0, 10) ?? null,
  ocrAmount: receipt.ocrAmount === null ? null : Number(receipt.ocrAmount),
  ocrStatus: receipt.ocrStatus,
  uploadedAt: receipt.uploadedAt,
});

const blankExtraction = {
  vendor: null,
  date: null,
  amount: null,
  suggestedCategoryId: null,
};

const extractReceiptData = async (userId: string, buffer: Buffer) => {
  try {
    const ocr = await recognizeReceipt(buffer);
    if (!ocr.text) {
      return {
        extracted: blankExtraction,
        ocrStatus: 'FAILED' as const,
        confidence: ocr.confidence,
        manualEntryRequired: true,
      };
    }

    let categories: Array<{ id: string; name: string }> = [];
    try {
      categories = await prisma.category.findMany({
        where: {
          OR: [
            { userId: null, isDefault: true },
            { userId, isDefault: false },
          ],
        },
        select: { id: true, name: true },
      });
    } catch (error) {
      console.error('[ExpenseAI OCR] Failed to load default receipt categories:', error);
    }

    const extracted = parseReceiptText(ocr.text, categories);
    const complete = Boolean(extracted.vendor && extracted.date && extracted.amount);
    return {
      extracted,
      ocrStatus: complete ? 'SUCCEEDED' as const : 'FAILED' as const,
      confidence: ocr.confidence,
      manualEntryRequired: !complete,
    };
  } catch (error) {
    console.warn('[ExpenseAI OCR] Receipt extraction failed; manual entry is available:', error);
    return {
      extracted: blankExtraction,
      ocrStatus: 'FAILED' as const,
      confidence: null,
      manualEntryRequired: true,
    };
  }
};

const uploadImage = async (
  receiptId: string,
  file: Express.Multer.File
): Promise<StoredReceiptObject> => {
  const format = await validateReceiptImage(file);
  return uploadReceiptObject(receiptId, file.buffer, format);
};

const cleanFailedUpload = async (stored: StoredReceiptObject) => {
  try {
    await deleteReceiptObject(stored.provider, stored.storageKey, stored.storageFormat);
  } catch (cleanupError) {
    console.error('[ExpenseAI receipt storage] Failed to clean up an unrecorded upload:', cleanupError);
  }
};

const scanResponse = (
  receiptId: string,
  extraction: Awaited<ReturnType<typeof extractReceiptData>>
) => ({
  receiptId,
  fileUrl: receiptFileUrl(receiptId),
  ocrStatus: extraction.ocrStatus,
  confidence: extraction.confidence,
  manualEntryRequired: extraction.manualEntryRequired,
  extracted: extraction.extracted,
});

export const uploadAndProcessReceipt = async (
  userId: string,
  file: Express.Multer.File
) => {
  const receiptId = randomUUID();
  const stored = await uploadImage(receiptId, file);
  let receipt;

  try {
    receipt = await prisma.receipt.create({
      data: {
        id: receiptId,
        userId,
        expenseId: null,
        fileUrl: receiptFileUrl(receiptId),
        storageProvider: stored.provider,
        storageKey: stored.storageKey,
        storageFormat: stored.storageFormat,
        ocrStatus: 'PROCESSING',
      },
    });
  } catch (error) {
    await cleanFailedUpload(stored);
    throw error;
  }

  const extraction = await extractReceiptData(userId, file.buffer);
  receipt = await prisma.receipt.update({
    where: { id: receiptId },
    data: {
      ocrVendor: extraction.extracted.vendor,
      ocrDate: extraction.extracted.date
        ? new Date(`${extraction.extracted.date}T00:00:00.000Z`)
        : null,
      ocrAmount: extraction.extracted.amount,
      ocrStatus: extraction.ocrStatus,
    },
  });

  return {
    ...scanResponse(receipt.id, extraction),
    receipt: toReceiptResponse(receipt),
  };
};

export const confirmReceiptAndCreateExpense = async (
  userId: string,
  receiptId: string,
  input: CreateExpenseInput
) => {
  const result = await createExpenseWithReceipt(userId, receiptId, input);
  return {
    expense: result.expense,
    receipt: toReceiptResponse(result.receipt),
  };
};

export const getReceiptMetadata = async (userId: string, receiptId: string) => {
  const receipt = await prisma.receipt.findFirst({
    where: { id: receiptId, userId },
  });
  if (!receipt) {
    throw new AuthError('Receipt was not found.', 404, 'RECEIPT_NOT_FOUND');
  }
  return toReceiptResponse(receipt);
};

export const getReceiptFile = async (userId: string, receiptId: string) => {
  const receipt = await prisma.receipt.findFirst({
    where: { id: receiptId, userId },
  });
  if (!receipt) {
    throw new AuthError('Receipt was not found.', 404, 'RECEIPT_NOT_FOUND');
  }

  if (receipt.storageProvider === 'CLOUDINARY') {
    if (!receipt.storageKey) {
      throw new AuthError('Receipt storage reference is unavailable.', 500, 'RECEIPT_STORAGE_MISSING');
    }
    return { redirectUrl: createReceiptViewUrl(
      receipt.storageProvider,
      receipt.storageKey,
      receipt.storageFormat
    ) };
  }

  const filePath = await getLocalReceiptPath(receipt.id, receipt.storageKey);
  if (!filePath) {
    throw new AuthError('Receipt file was not found.', 404, 'RECEIPT_FILE_NOT_FOUND');
  }
  return { filePath };
};

export const replaceReceipt = async (
  userId: string,
  receiptId: string,
  file: Express.Multer.File
) => {
  const current = await prisma.receipt.findFirst({
    where: { id: receiptId, userId },
  });
  if (!current) {
    throw new AuthError('Receipt was not found.', 404, 'RECEIPT_NOT_FOUND');
  }

  const replacementId = `${receiptId}-${randomUUID()}`;
  const stored = await uploadImage(replacementId, file);
  const extraction = await extractReceiptData(userId, file.buffer);

  let updated;
  try {
    updated = await prisma.$transaction(async (transaction) => {
      const ownedReceipt = await transaction.receipt.findFirst({
        where: { id: receiptId, userId },
      });
      if (!ownedReceipt) {
        throw new AuthError('Receipt was not found.', 404, 'RECEIPT_NOT_FOUND');
      }

      await enqueueReceiptStorageCleanup(transaction, ownedReceipt);
      return transaction.receipt.update({
        where: { id: receiptId },
        data: {
          fileUrl: receiptFileUrl(receiptId),
          storageProvider: stored.provider,
          storageKey: stored.storageKey,
          storageFormat: stored.storageFormat,
          ocrVendor: extraction.extracted.vendor,
          ocrDate: extraction.extracted.date
            ? new Date(`${extraction.extracted.date}T00:00:00.000Z`)
            : null,
          ocrAmount: extraction.extracted.amount,
          ocrStatus: extraction.ocrStatus,
          uploadedAt: new Date(),
        },
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch (error) {
    await cleanFailedUpload(stored);
    throw error;
  }

  await drainReceiptStorageCleanupQueue().catch((error: unknown) => {
    console.error('[ExpenseAI receipt cleanup] Replacement cleanup remains queued:', error);
  });
  return {
    ...scanResponse(updated.id, extraction),
    receipt: toReceiptResponse(updated),
  };
};

export const deleteReceipt = async (userId: string, receiptId: string) => {
  await prisma.$transaction(async (transaction) => {
    const receipt = await transaction.receipt.findFirst({
      where: { id: receiptId, userId },
    });
    if (!receipt) {
      throw new AuthError('Receipt was not found.', 404, 'RECEIPT_NOT_FOUND');
    }

    await enqueueReceiptStorageCleanup(transaction, receipt);
    await transaction.receipt.delete({ where: { id: receiptId } });
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });

  await drainReceiptStorageCleanupQueue().catch((error: unknown) => {
    console.error('[ExpenseAI receipt cleanup] Receipt deletion remains queued:', error);
  });
};

export const associateReceiptWithExpense = async (
  userId: string,
  receiptId: string,
  expenseId: string
) => {
  const uploadedAfter = new Date(Date.now() - TEMPORARY_RECEIPT_TTL_MS);
  return prisma.$transaction(async (transaction) => {
    const receipt = await transaction.receipt.findFirst({
      where: { id: receiptId, userId },
    });
    if (!receipt) {
      throw new AuthError('Receipt was not found.', 404, 'RECEIPT_NOT_FOUND');
    }
    if (receipt.expenseId) {
      throw new AuthError('Receipt has already been attached.', 409, 'RECEIPT_ALREADY_CONFIRMED');
    }
    if (receipt.uploadedAt < uploadedAfter) {
      throw new AuthError('Temporary receipt has expired.', 410, 'RECEIPT_EXPIRED');
    }

    const expense = await transaction.expense.findFirst({
      where: { id: expenseId, userId },
      select: { id: true },
    });
    if (!expense) {
      throw new AuthError('Expense was not found.', 404, 'EXPENSE_NOT_FOUND');
    }

    const attached = await transaction.receipt.updateMany({
      where: {
        id: receiptId,
        userId,
        expenseId: null,
        uploadedAt: { gte: uploadedAfter },
      },
      data: { expenseId },
    });
    if (attached.count !== 1) {
      throw new AuthError('Receipt has already been attached or expired.', 409, 'RECEIPT_NOT_ATTACHABLE');
    }

    return toReceiptResponse({
      ...receipt,
      expenseId,
    });
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
};
