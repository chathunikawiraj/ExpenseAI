import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createWorker } from 'tesseract.js';
import prisma from '../config/database';
import { AuthError } from './auth.service';

const uploadsDirectory = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(uploadsDirectory, { recursive: true });

export const receiptUploadDirectory = uploadsDirectory;

const toReceiptResponse = (receipt: {
  id: string;
  expenseId: string | null;
  fileUrl: string;
  ocrVendor: string | null;
  ocrDate: Date | null;
  ocrAmount: unknown;
  ocrStatus: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  uploadedAt: Date;
}) => ({
  id: receipt.id,
  expenseId: receipt.expenseId,
  receiptId: receipt.id,
  fileUrl: receipt.fileUrl,
  ocrVendor: receipt.ocrVendor,
  ocrDate: receipt.ocrDate?.toISOString().slice(0, 10) ?? null,
  ocrAmount: receipt.ocrAmount === null || receipt.ocrAmount === undefined
    ? null
    : Number(receipt.ocrAmount),
  ocrStatus: receipt.ocrStatus,
  uploadedAt: receipt.uploadedAt,
});

const extractVendor = (text: string) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 2);
  return lines[0]?.replace(/[^a-zA-Z0-9 &'-]/g, '').trim().slice(0, 100) ?? null;
};

const extractAmount = (text: string) => {
  const matches = text.match(/(?:total|amount|grand total)[^\d]*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})|\d+(?:\.\d{1,2})?)/gi);
  if (!matches?.length) return null;
  const amount = matches[matches.length - 1].match(/(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})|\d+(?:\.\d{1,2})?)/);
  if (!amount) return null;
  const value = Number(amount[1].replace(/,/g, ''));
  return Number.isFinite(value) && value > 0 ? value : null;
};

const extractDate = (text: string) => {
  const match = text.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
  if (!match) return null;
  let value: Date;
  if (/^\d{4}-/.test(match[1])) {
    value = new Date(`${match[1]}T00:00:00.000Z`);
  } else {
    const parts = match[1].split(/[/-]/).map(Number);
    const year = parts[2] < 100 ? 2000 + parts[2] : parts[2];
    value = new Date(Date.UTC(year, parts[1] - 1, parts[0]));
  }
  return Number.isNaN(value.getTime()) ? null : value;
};

export const uploadAndProcessReceipt = async (
  userId: string,
  file: { originalname: string; path: string; size: number }
) => {
  const id = randomUUID();
  const extension = path.extname(file.originalname).toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(extension)) {
    fs.unlinkSync(file.path);
    throw new AuthError('Only JPG and PNG receipt images are supported.', 400, 'INVALID_RECEIPT_TYPE');
  }
  if (file.size > 5 * 1024 * 1024) {
    fs.unlinkSync(file.path);
    throw new AuthError('Receipt file exceeds the 5 MB limit.', 400, 'RECEIPT_TOO_LARGE');
  }

  const bytes = fs.readFileSync(file.path).subarray(0, 8);
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  if (!jpeg && !png) {
    fs.unlinkSync(file.path);
    throw new AuthError('Invalid receipt image content.', 400, 'INVALID_RECEIPT_IMAGE');
  }

  const storedName = `${id}${extension}`;
  const storedPath = path.join(uploadsDirectory, storedName);
  fs.renameSync(file.path, storedPath);

  let receipt = await prisma.receipt.create({
    data: {
      id,
      userId,
      expenseId: null,
      fileUrl: `/api/v1/receipts/${id}/file`,
      ocrStatus: 'PROCESSING',
    },
  });

  try {
    const worker = await createWorker('eng');
    const result = await worker.recognize(storedPath);
    await worker.terminate();
    const text = result.data.text;
    const vendor = extractVendor(text);
    const amount = extractAmount(text);
    const date = extractDate(text);

    const categories = await prisma.category.findMany({
      where: {
        OR: [{ userId: null, isDefault: true }, { userId, isDefault: false }],
      },
    });
    const lowerText = text.toLowerCase();
    const suggestedCategory = categories.find((category) =>
      lowerText.includes(category.name.toLowerCase())
    ) ?? categories[0];

    receipt = await prisma.receipt.update({
      where: { id },
      data: {
        ocrVendor: vendor,
        ocrAmount: amount,
        ocrDate: date,
        ocrStatus: vendor || amount || date ? 'SUCCEEDED' : 'FAILED',
      },
    });

    return {
      receiptId: receipt.id,
      fileUrl: receipt.fileUrl,
      extracted: {
        vendor,
        date: date?.toISOString().slice(0, 10) ?? null,
        amount,
        suggestedCategoryId: suggestedCategory?.id ?? '',
        success: receipt.ocrStatus === 'SUCCEEDED',
      },
    };
  } catch (error) {
    await prisma.receipt.update({
      where: { id },
      data: { ocrStatus: 'FAILED' },
    });
    throw error;
  }
};

export const associateReceiptWithExpense = async (
  userId: string,
  receiptId: string,
  expenseId: string
) => {
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, userId },
  });
  if (!expense) throw new AuthError('Expense was not found.', 404, 'EXPENSE_NOT_FOUND');
  const receipt = await prisma.receipt.findFirst({ where: { id: receiptId, userId } });
  if (!receipt) throw new AuthError('Receipt was not found.', 404, 'RECEIPT_NOT_FOUND');
  return toReceiptResponse(await prisma.receipt.update({
    where: { id: receiptId },
    data: { expenseId },
  }));
};

export const deleteReceipt = async (userId: string, receiptId: string) => {
  const receipt = await prisma.receipt.findFirst({ where: { id: receiptId, userId } });
  if (!receipt) throw new AuthError('Receipt was not found.', 404, 'RECEIPT_NOT_FOUND');
  await prisma.receipt.delete({ where: { id: receiptId } });
  const fileName = receipt.fileUrl.split('/').at(-2);
  if (fileName) {
    const possible = fs.readdirSync(uploadsDirectory).find((name) => name.startsWith(receipt.id));
    if (possible) fs.unlinkSync(path.join(uploadsDirectory, possible));
  }
};

export const getReceiptFile = async (userId: string, receiptId: string) => {
  const receipt = await prisma.receipt.findFirst({ where: { id: receiptId, userId } });
  if (!receipt) throw new AuthError('Receipt was not found.', 404, 'RECEIPT_NOT_FOUND');
  const fileName = fs.readdirSync(uploadsDirectory).find((name) => name.startsWith(receipt.id));
  if (!fileName) throw new AuthError('Receipt file was not found.', 404, 'RECEIPT_FILE_NOT_FOUND');
  return path.join(uploadsDirectory, fileName);
};
