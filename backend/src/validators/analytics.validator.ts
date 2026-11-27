import { z } from 'zod';

const analyticsDateSchema = z
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

const analyticsMonthSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}$/, 'Month must use YYYY-MM format.')
  .refine((value) => {
    const [year, month] = value.split('-').map(Number);
    return year >= 2000 && month >= 1 && month <= 12;
  }, 'Month must be a valid month.');

export const analyticsSummaryQuerySchema = z
  .object({
    month: analyticsMonthSchema.optional(),
    startDate: analyticsDateSchema.optional(),
    endDate: analyticsDateSchema.optional(),
  })
  .strict()
  .refine(
    ({ startDate, endDate }) => !startDate || !endDate || startDate <= endDate,
    { message: 'startDate must be on or before endDate.', path: ['endDate'] }
  )
  .refine(
    ({ month, startDate, endDate }) => !month || (!startDate && !endDate),
    { message: 'Use month or startDate/endDate, but not both.', path: ['month'] }
  )
  .transform((query) => {
    if (!query.month) return query;

    const [year, month] = query.month.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0));
    return { ...query, startDate, endDate };
  });

export type AnalyticsSummaryQuery = z.infer<typeof analyticsSummaryQuerySchema>;

export const analyticsDateRangeQuerySchema = z
  .object({
    startDate: analyticsDateSchema.optional(),
    endDate: analyticsDateSchema.optional(),
  })
  .strict()
  .refine(
    ({ startDate, endDate }) => !startDate || !endDate || startDate <= endDate,
    { message: 'startDate must be on or before endDate.', path: ['endDate'] }
  );

// When both are supplied, `month` controls the requested period. `months` is
// still validated against its 1-24 range, even when `month` is present.
export const analyticsTrendsQuerySchema = z
  .object({
    month: analyticsMonthSchema.optional(),
    months: z.coerce.number().int().min(1).max(24).default(6),
  })
  .strict();

export type AnalyticsDateRangeQuery = z.infer<typeof analyticsDateRangeQuerySchema>;
export type AnalyticsTrendsQuery = z.infer<typeof analyticsTrendsQuerySchema>;
