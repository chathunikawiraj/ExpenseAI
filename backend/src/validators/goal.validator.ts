import { z } from 'zod';
import { nonNegativeMoneySchema, positiveMoneySchema } from './money.validator';

const calendarDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Date must be a real calendar date.')
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

export const goalIdSchema = z.string().uuid();

export const createGoalSchema = z.object({
  name: z.string().trim().min(1).max(100),
  targetAmount: positiveMoneySchema,
  savedAmount: nonNegativeMoneySchema.optional(),
  targetDate: calendarDateSchema.optional(),
}).strict();

export const updateGoalSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  targetAmount: positiveMoneySchema.optional(),
  targetDate: calendarDateSchema.nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

export const contributionSchema = z.object({
  amount: positiveMoneySchema,
  date: calendarDateSchema.optional(),
  note: z.string().trim().max(300).optional(),
}).strict();

export const contributionQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export type ContributionQuery = z.infer<typeof contributionQuerySchema>;
