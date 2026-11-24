import { z } from 'zod';

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

export const goalIdSchema = z.string().uuid();

export const createGoalSchema = z.object({
  name: z.string().trim().min(2).max(100),
  targetAmount: z.number().finite().positive().max(99_999_999.99),
  savedAmount: z.number().finite().nonnegative().max(99_999_999.99).optional(),
  targetDate: dateSchema.optional(),
}).strict();

export const updateGoalSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  targetAmount: z.number().finite().positive().max(99_999_999.99).optional(),
  targetDate: dateSchema.nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

export const contributionSchema = z.object({
  amount: z.number().finite().positive().max(99_999_999.99),
  date: dateSchema.optional(),
  note: z.string().trim().max(300).optional(),
}).strict();
