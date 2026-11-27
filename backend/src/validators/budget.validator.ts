import { z } from 'zod';
import { positiveMoneySchema } from './money.validator';

export const monthStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}$/, 'Month must use YYYY-MM format.')
  .refine((value) => {
    const [year, month] = value.split('-').map(Number);
    return year >= 1 && month >= 1 && month <= 12;
  }, 'Month must be a valid calendar month.');

export const upsertBudgetSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  month: monthStringSchema,
  amount: positiveMoneySchema,
}).strict();

export const updateBudgetSchema = upsertBudgetSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one budget field must be provided.');

export const budgetIdSchema = z.string().uuid();
export const budgetQuerySchema = z.object({
  month: monthStringSchema.optional(),
}).strict();

export type UpsertBudgetInput = z.infer<typeof upsertBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
