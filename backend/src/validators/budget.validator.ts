import { z } from 'zod';

export const monthSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}$/, 'Month must use YYYY-MM format.')
  .refine((value) => {
    const [year, month] = value.split('-').map(Number);
    return year >= 2000 && month >= 1 && month <= 12;
  }, 'Month must be valid.')
  .transform((value) => new Date(`${value}-01T00:00:00.000Z`));

export const upsertBudgetSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  month: z.string().trim().regex(/^\d{4}-\d{2}$/),
  amount: z.number().finite().positive().max(99_999_999.99),
}).strict();

export const budgetIdSchema = z.string().uuid();
export const budgetQuerySchema = z.object({
  month: z.string().trim().regex(/^\d{4}-\d{2}$/).optional(),
}).strict();

export type UpsertBudgetInput = z.infer<typeof upsertBudgetSchema>;
