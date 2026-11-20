import { z } from 'zod';

const incomeDateSchema = z.string().trim().min(1).pipe(z.coerce.date());

const incomeFields = {
  amount: z
    .number()
    .finite()
    .positive('Income amount must be greater than zero.')
    .max(99_999_999.99, 'Income amount exceeds the supported limit.')
    .refine(
      (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
      'Income amount cannot have more than 2 decimal places.'
    ),
  source: z
    .string()
    .trim()
    .min(1, 'Income source is required.')
    .max(100, 'Income source cannot exceed 100 characters.'),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters.')
    .optional(),
  date: incomeDateSchema,
};

export const createIncomeSchema = z.object(incomeFields);

export const updateIncomeSchema = z
  .object({
    ...incomeFields,
    amount: incomeFields.amount.optional(),
    source: incomeFields.source.optional(),
    description: incomeFields.description,
    date: incomeDateSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one income field to update.');

export const incomeIdSchema = z.string().uuid();

export const incomeQuerySchema = z.object({
  source: z.string().trim().max(100).optional(),
  startDate: incomeDateSchema.optional(),
  endDate: incomeDateSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
export type UpdateIncomeInput = z.infer<typeof updateIncomeSchema>;
export type IncomeQuery = z.infer<typeof incomeQuerySchema>;
