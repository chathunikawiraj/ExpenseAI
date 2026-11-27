import type { RequestHandler } from 'express';
import {
  associateReceiptWithExpense,
  confirmReceiptAndCreateExpense,
  deleteReceipt,
  getReceiptFile,
  getReceiptMetadata,
  replaceReceipt,
  uploadAndProcessReceipt,
} from '../services/receipts.service';
import type { ConfirmReceiptInput } from '../validators/receipt.validator';

export const uploadReceipt: RequestHandler = async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'A receipt image is required.', code: 'RECEIPT_FILE_REQUIRED' });
    return;
  }
  const result = await uploadAndProcessReceipt(req.authUser!.userId, req.file);
  res.status(201).json(result);
};

export const confirmReceipt: RequestHandler = async (req, res) => {
  const { receiptId, ...expense } = req.body as ConfirmReceiptInput;
  const result = await confirmReceiptAndCreateExpense(
    req.authUser!.userId,
    receiptId,
    expense
  );
  res.status(201).json(result);
};

export const readReceipt: RequestHandler = async (req, res) => {
  const receipt = await getReceiptMetadata(req.authUser!.userId, req.params.id as string);
  res.status(200).json(receipt);
};

export const replaceReceiptImage: RequestHandler = async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'A replacement receipt image is required.', code: 'RECEIPT_FILE_REQUIRED' });
    return;
  }
  const receipt = await replaceReceipt(
    req.authUser!.userId,
    req.params.id as string,
    req.file
  );
  res.status(200).json(receipt);
};

export const removeReceipt: RequestHandler = async (req, res) => {
  await deleteReceipt(req.authUser!.userId, req.params.id as string);
  res.status(200).json({ message: 'Receipt deleted successfully.' });
};

export const serveReceiptFile: RequestHandler = async (req, res, next) => {
  const file = await getReceiptFile(req.authUser!.userId, req.params.id as string);
  if (file.redirectUrl) {
    res.redirect(302, file.redirectUrl);
    return;
  }
  if (!file.filePath) {
    res.status(404).json({ error: 'Receipt file was not found.', code: 'RECEIPT_FILE_NOT_FOUND' });
    return;
  }
  res.sendFile(file.filePath, (error) => {
    if (error) next(error);
  });
};

export const associateReceipt: RequestHandler = async (req, res) => {
  const receipt = await associateReceiptWithExpense(
    req.authUser!.userId,
    req.params.id as string,
    req.body.expenseId
  );
  res.status(200).json(receipt);
};
