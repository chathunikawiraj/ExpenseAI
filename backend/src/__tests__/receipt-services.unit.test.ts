import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import { parseReceiptText } from '../services/receipt-parser.service.js';
import { validateReceiptImage } from '../services/receipt-file-validation.service.js';
import {
  recognizeReceipt,
  ReceiptOcrTimeoutError,
} from '../services/receipt-ocr.service.js';
import type { ReceiptOcrWorkerFactory } from '../services/receipt-ocr.service.js';

const imageFile = (
  originalname: string,
  mimetype: string,
  buffer: Buffer,
  size = buffer.length
) => ({ originalname, mimetype, buffer, size });

const createWorkerFactory = (
  recognize: () => Promise<{ data: { text: string; confidence: number } }>,
  terminate: () => Promise<{ jobId: string; data: unknown }>
): ReceiptOcrWorkerFactory => async () => {
  const worker = { recognize, terminate };
  return worker as unknown as Awaited<ReturnType<ReceiptOcrWorkerFactory>>;
};

test('receipt parser extracts a labelled total and unambiguous leap-day date', () => {
  const parsed = parseReceiptText(
    'NORTH MARKET\nDate: 02/29/2028\nGrand Total: $1,234.50',
    [{ id: 'food-category', name: 'Food & Groceries' }]
  );

  assert.equal(parsed.vendor, 'NORTH MARKET');
  assert.equal(parsed.date, '2028-02-29');
  assert.equal(parsed.amount, 1234.5);
  assert.equal(parsed.suggestedCategoryId, 'food-category');
});

test('receipt parser supports month-first dates and decimal-comma totals', () => {
  const parsed = parseReceiptText(
    'North Market\nDate: February 29, 2028\nGrand Total: 1.234,56',
    []
  );

  assert.equal(parsed.date, '2028-02-29');
  assert.equal(parsed.amount, 1234.56);
});

test('receipt parser leaves ambiguous dates and unlabelled totals unset', () => {
  const parsed = parseReceiptText(
    'Corner Shop\nDate: 01/02/2028\nItem 9.99\nTotal: 12.50\nTotal: 15.00',
    []
  );

  assert.equal(parsed.date, null);
  assert.equal(parsed.amount, null);
});

test('receipt parser leaves unavailable vendor, date, and amount fields null', () => {
  const missingVendor = parseReceiptText('Date: 2028-02-29\nGrand Total: 12.50', []);
  const missingDate = parseReceiptText('North Market\nGrand Total: 12.50', []);
  const missingAmount = parseReceiptText('North Market\nDate: 2028-02-29', []);

  assert.equal(missingVendor.vendor, null);
  assert.equal(missingDate.date, null);
  assert.equal(missingAmount.amount, null);
});

test('receipt image validation accepts JPG, JPEG, and PNG content', async () => {
  const png = await sharp({
    create: { width: 10, height: 10, channels: 3, background: '#ffffff' },
  }).png().toBuffer();
  const jpg = await sharp(png).jpeg().toBuffer();

  assert.equal(
    await validateReceiptImage(imageFile('receipt.jpg', 'image/jpeg', jpg)),
    'jpg'
  );
  assert.equal(
    await validateReceiptImage(imageFile('receipt.jpeg', 'image/jpeg', jpg)),
    'jpg'
  );
  assert.equal(
    await validateReceiptImage(imageFile('receipt.png', 'image/png', png)),
    'png'
  );
});

test('receipt image validation rejects oversized, renamed, and corrupted images', async () => {
  const png = await sharp({
    create: { width: 10, height: 10, channels: 3, background: '#ffffff' },
  }).png().toBuffer();
  const oversized = imageFile('receipt.png', 'image/png', png, 5 * 1024 * 1024 + 1);
  const renamed = imageFile('receipt.jpg', 'image/jpeg', Buffer.from('not an image'));
  const corrupted = imageFile(
    'broken.jpg',
    'image/jpeg',
    Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01])
  );

  await assert.rejects(validateReceiptImage(oversized), /5 MB/);
  await assert.rejects(validateReceiptImage(imageFile('receipt.gif', 'image/gif', png)));
  await assert.rejects(validateReceiptImage(renamed), /content/i);
  await assert.rejects(validateReceiptImage(corrupted), /valid, readable/i);
});

test('receipt OCR returns recognized text and confidence', async () => {
  const workerFactory = createWorkerFactory(
    async () => ({ data: { text: '  Store receipt  ', confidence: 92 } }),
    async () => ({ jobId: 'worker', data: null })
  );

  assert.deepEqual(await recognizeReceipt(Buffer.from('image'), 100, workerFactory), {
    text: 'Store receipt',
    confidence: 92,
  });
});

test('receipt OCR reports worker failures and terminates the worker', async () => {
  let terminated = false;
  const workerFactory = createWorkerFactory(
    async () => {
      throw new Error('OCR worker failed');
    },
    async () => {
      terminated = true;
      return { jobId: 'worker', data: null };
    }
  );

  await assert.rejects(recognizeReceipt(Buffer.from('image'), 100, workerFactory), /worker failed/);
  assert.equal(terminated, true);
});

test('receipt OCR enforces its timeout and terminates the worker', async () => {
  let terminated = false;
  const workerFactory = createWorkerFactory(
    () => new Promise(() => {}),
    async () => {
      terminated = true;
      return { jobId: 'worker', data: null };
    }
  );

  await assert.rejects(
    recognizeReceipt(Buffer.from('image'), 5, workerFactory),
    ReceiptOcrTimeoutError
  );
  assert.equal(terminated, true);
});
