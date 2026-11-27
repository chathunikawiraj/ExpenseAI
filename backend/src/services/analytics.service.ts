import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import type { AnalyticsSummaryQuery } from '../validators/analytics.validator';
import type { AnalyticsDateRangeQuery, AnalyticsTrendsQuery } from '../validators/analytics.validator';

const toNumber = (value: Prisma.Decimal | null | undefined) =>
  value ? Number(value) : 0;

export const getAnalyticsSummary = async (
  userId: string,
  query: AnalyticsSummaryQuery
) => {
  const dateFilter =
    query.startDate || query.endDate
      ? {
          ...(query.startDate ? { gte: query.startDate } : {}),
          ...(query.endDate ? { lte: query.endDate } : {}),
        }
      : undefined;

  const incomeWhere: Prisma.IncomeWhereInput = {
    userId,
    ...(dateFilter ? { date: dateFilter } : {}),
  };
  const expenseWhere: Prisma.ExpenseWhereInput = {
    userId,
    ...(dateFilter ? { date: dateFilter } : {}),
  };

  const [
    incomeAggregate,
    expenseAggregate,
    incomeCount,
    expenseCount,
  ] = await Promise.all([
    prisma.income.aggregate({
      where: incomeWhere,
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: expenseWhere,
      _sum: { amount: true },
    }),
    prisma.income.count({ where: incomeWhere }),
    prisma.expense.count({ where: expenseWhere }),
  ]);

  const totalIncome = toNumber(incomeAggregate._sum.amount);
  const totalExpenses = toNumber(expenseAggregate._sum.amount);
  const netBalance = totalIncome - totalExpenses;

  return {
    totalIncome,
    totalExpenses,
    netBalance,
    transactionCount: incomeCount + expenseCount,
    incomeCount,
    expenseCount,
    dateRange: {
      startDate: query.startDate?.toISOString().slice(0, 10) ?? null,
      endDate: query.endDate?.toISOString().slice(0, 10) ?? null,
    },
  };
};

interface MonthlyTrendRow {
  month: string;
  income: unknown;
  expense: unknown;
}

interface DailyTrendRow {
  date: string;
  income: unknown;
  expense: unknown;
}

const utcDateOnly = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;

const shiftUtcDays = (date: Date, days: number): Date =>
  new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + days,
  ));

export const getCategoryBreakdown = async (
  userId: string,
  query: AnalyticsDateRangeQuery
) => {
  const dateFilter =
    query.startDate || query.endDate
      ? {
          ...(query.startDate ? { gte: query.startDate } : {}),
          ...(query.endDate ? { lte: query.endDate } : {}),
        }
      : undefined;

  const expenses = await prisma.expense.groupBy({
    by: ['categoryId'],
    where: {
      userId,
      ...(dateFilter ? { date: dateFilter } : {}),
    },
    _sum: { amount: true },
  });

  const categoryIds = expenses.map((item) => item.categoryId);
  const categories = categoryIds.length
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      })
    : [];
  const categoryById = new Map(categories.map((category) => [category.id, category.name]));

  const rows = expenses
    .map((item) => ({
      categoryId: item.categoryId,
      name: categoryById.get(item.categoryId) ?? 'Uncategorized',
      amount: Number(item._sum.amount ?? 0),
    }))
    .sort((left, right) => right.amount - left.amount);
  const totalExpenses = rows.reduce((total, row) => total + row.amount, 0);

  return {
    totalExpenses,
    categories: rows.map((row) => ({
      ...row,
      percentage: totalExpenses > 0 ? (row.amount / totalExpenses) * 100 : 0,
    })),
  };
};

export const getAnalyticsTrends = async (
  userId: string,
  query: AnalyticsTrendsQuery
) => {
  const now = new Date();
  const currentMonthStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    1,
  ));
  const monthStart = query.month
    ? new Date(`${query.month}-01T00:00:00.000Z`)
    : new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() - (query.months - 1),
        1,
      ));
  const monthEndExclusive = query.month
    ? new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1))
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const monthSeriesEnd = query.month ? monthStart : currentMonthStart;
  const todayUtc = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  ));
  const dailyStart = query.month ? monthStart : shiftUtcDays(todayUtc, -29);
  const dailyEndExclusive = query.month ? monthEndExclusive : shiftUtcDays(todayUtc, 1);
  const monthlyStartDate = utcDateOnly(monthStart);
  const monthlyEndDate = utcDateOnly(monthEndExclusive);
  const dailyStartDate = utcDateOnly(dailyStart);
  const dailyEndDate = utcDateOnly(dailyEndExclusive);

  const monthlyRows = await prisma.$queryRaw<MonthlyTrendRow[]>(Prisma.sql`
    WITH "income_monthly" AS (
      SELECT date_trunc('month', "date"::timestamp) AS "month", sum("amount")::numeric AS "income"
      FROM "Income"
      WHERE "userId" = ${userId}::uuid
        AND "date" >= ${monthlyStartDate}::date
        AND "date" < ${monthlyEndDate}::date
      GROUP BY date_trunc('month', "date"::timestamp)
    ),
    "expense_monthly" AS (
      SELECT date_trunc('month', "date"::timestamp) AS "month", sum("amount")::numeric AS "expense"
      FROM "Expense"
      WHERE "userId" = ${userId}::uuid
        AND "date" >= ${monthlyStartDate}::date
        AND "date" < ${monthlyEndDate}::date
      GROUP BY date_trunc('month', "date"::timestamp)
    ),
    "months" AS (
      SELECT generate_series(
        ${monthlyStartDate}::date::timestamp,
        ${utcDateOnly(monthSeriesEnd)}::date::timestamp,
        interval '1 month'
      ) AS "month"
    )
    SELECT
      to_char(m."month", 'YYYY-MM') AS "month",
      COALESCE(i."income", 0)::text AS "income",
      COALESCE(e."expense", 0)::text AS "expense"
    FROM "months" m
    LEFT JOIN "income_monthly" i ON i."month" = m."month"
    LEFT JOIN "expense_monthly" e ON e."month" = m."month"
    ORDER BY m."month" ASC
  `);

  const dailyRows = await prisma.$queryRaw<DailyTrendRow[]>(Prisma.sql`
    WITH "income_daily" AS (
      SELECT "date", sum("amount")::numeric AS "income"
      FROM "Income"
      WHERE "userId" = ${userId}::uuid
        AND "date" >= ${dailyStartDate}::date
        AND "date" < ${dailyEndDate}::date
      GROUP BY "date"
    ),
    "expense_daily" AS (
      SELECT "date", sum("amount")::numeric AS "expense"
      FROM "Expense"
      WHERE "userId" = ${userId}::uuid
        AND "date" >= ${dailyStartDate}::date
        AND "date" < ${dailyEndDate}::date
      GROUP BY "date"
    ),
    "days" AS (
      SELECT generate_series(
        ${dailyStartDate}::date::timestamp,
        (${dailyEndDate}::date - 1)::timestamp,
        interval '1 day'
      )::date AS "date"
    )
    SELECT
      to_char(d."date", 'YYYY-MM-DD') AS "date",
      COALESCE(i."income", 0)::text AS "income",
      COALESCE(e."expense", 0)::text AS "expense"
    FROM "days" d
    LEFT JOIN "income_daily" i ON i."date" = d."date"
    LEFT JOIN "expense_daily" e ON e."date" = d."date"
    ORDER BY d."date" ASC
  `);

  return {
    monthly: monthlyRows.map((row) => ({
      month: row.month,
      income: Number(row.income),
      expense: Number(row.expense),
    })),
    daily: dailyRows.map((row) => ({
      date: row.date,
      income: Number(row.income),
      expense: Number(row.expense),
    })),
  };
};
