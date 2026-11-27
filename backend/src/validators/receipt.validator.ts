import { z } from 'zod';
import { createExpenseSchema } from './expense.validator';

export const receiptIdSchema = z.string().uuid();
export const associateReceiptSchema = z.object({
  expenseId: z.string().uuid(),
}).strict();

export const confirmReceiptSchema = z.object({
  receiptId: receiptIdSchema,
  ...createExpenseSchema.shape,
}).strict();

export type ConfirmReceiptInput = z.infer<typeof confirmReceiptSchema>;
