import type { RequestHandler } from 'express';
import { z } from 'zod';
import {
  associateReceiptWithExpense,
  deleteReceipt,
  getReceiptFile,
  uploadAndProcessReceipt,
} from '../services/receipts.service';

export const uploadReceipt: RequestHandler = async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'A receipt image is required.' });
    return;
  }
  const result = await uploadAndProcessReceipt(
    req.authUser!.userId,
    req.file
  );
  res.status(201).json(result);
};

export const removeReceipt: RequestHandler = async (req, res) => {
  await deleteReceipt(req.authUser!.userId, req.params.id as string);
  res.status(200).json({ message: 'Receipt deleted successfully.' });
};

export const serveReceiptFile: RequestHandler = async (req, res) => {
  const filePath = await getReceiptFile(
    req.authUser!.userId,
    req.params.id as string
  );
  res.sendFile(filePath);
};

export const associateReceipt: RequestHandler = async (req, res) => {
  const parsed = z.object({ expenseId: z.string().uuid() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed.', details: parsed.error.issues });
    return;
  }
  const receipt = await associateReceiptWithExpense(
    req.authUser!.userId,
    req.params.id as string,
    parsed.data.expenseId
  );
  res.status(200).json(receipt);
};
