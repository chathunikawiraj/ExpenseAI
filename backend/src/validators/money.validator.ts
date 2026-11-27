import { Prisma } from '@prisma/client';
import { z } from 'zod';

const MAX_AMOUNT = new Prisma.Decimal('9999999.99');

const decimalAmountSchema = z
  .union([z.number().finite().transform(String), z.string().trim()])
  .refine((value) => /^\d+(?:\.\d{1,2})?$/.test(value), {
    message: 'Amount must be a decimal value with no more than two decimal places.',
  })
  .transform((value) => new Prisma.Decimal(value))
  .refine((value) => value.lte(MAX_AMOUNT), {
    message: 'Amount must not exceed 9999999.99.',
  });

export const positiveMoneySchema = decimalAmountSchema.refine((value) => value.gt(0), {
  message: 'Amount must be greater than zero.',
});

export const nonNegativeMoneySchema = decimalAmountSchema.refine((value) => value.gte(0), {
  message: 'Amount must not be negative.',
});
