import { z } from 'zod';

const transactionDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format.')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, 'Date must be a valid calendar date.')
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const paymentMethodSchema = z.enum([
  'CASH',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'BANK_TRANSFER',
  'OTHER',
]);

export const transactionQuerySchema = z
  .object({
    type: z.enum(['all', 'income', 'expense']).default('all'),
    search: z.string().trim().max(120).optional(),
    categoryId: z.string().uuid().optional(),
    paymentMethod: paymentMethodSchema.optional(),
    startDate: transactionDateSchema.optional(),
    endDate: transactionDateSchema.optional(),
    sortBy: z.enum(['date', 'amount', 'createdAt']).default('date'),
    order: z.enum(['asc', 'desc']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
  .refine(
    ({ startDate, endDate }) => !startDate || !endDate || startDate <= endDate,
    { message: 'startDate must be on or before endDate.', path: ['endDate'] }
  )
  .transform((query) => ({
    ...query,
    sortOrder: query.order ?? query.sortOrder ?? 'desc',
  }));

export type TransactionQuery = z.infer<typeof transactionQuerySchema>;
