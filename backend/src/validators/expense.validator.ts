import { z } from 'zod';

const expenseDateSchema = z.string().trim().min(1).pipe(z.coerce.date());
const amountSchema = z
  .number()
  .finite()
  .positive('Expense amount must be greater than zero.')
  .max(99_999_999.99, 'Expense amount exceeds the supported limit.')
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
    'Expense amount cannot have more than 2 decimal places.'
  );
const paymentMethodSchema = z.enum([
  'CASH',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'BANK_TRANSFER',
  'OTHER',
]);

export const createExpenseSchema = z.object({
  title: z.string().trim().min(1, 'Expense title is required.').max(100),
  amount: amountSchema,
  date: expenseDateSchema,
  categoryId: z.string().uuid(),
  paymentMethod: paymentMethodSchema.nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

export const updateExpenseSchema = z
  .object({
    title: z.string().trim().min(1, 'Expense title is required.').max(100).optional(),
    amount: amountSchema.optional(),
    date: expenseDateSchema.optional(),
    categoryId: z.string().uuid().optional(),
    paymentMethod: paymentMethodSchema.nullable().optional(),
    description: z.string().trim().max(500).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one expense field to update.');

export const expenseIdSchema = z.string().uuid();

export const expenseQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    categoryId: z.string().uuid().optional(),
    paymentMethod: paymentMethodSchema.optional(),
    startDate: expenseDateSchema.optional(),
    endDate: expenseDateSchema.optional(),
    sortBy: z.enum(['date', 'amount']).default('date'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine(
    ({ startDate, endDate }) => !startDate || !endDate || startDate <= endDate,
    { message: 'startDate must be on or before endDate.', path: ['endDate'] }
  );

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ExpenseQuery = z.infer<typeof expenseQuerySchema>;
