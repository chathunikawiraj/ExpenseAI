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
  month: Date;
  income: unknown;
  expense: unknown;
}

interface DailyTrendRow {
  date: Date;
  expense: unknown;
}

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
  const startMonth = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() - (query.months - 1),
    1
  ));

  const monthlyRows = await prisma.$queryRaw<MonthlyTrendRow[]>(Prisma.sql`
    WITH "income_monthly" AS (
      SELECT date_trunc('month', "date") AS "month", sum("amount")::numeric AS "income"
      FROM "Income"
      WHERE "userId" = ${userId}::uuid AND "date" >= ${startMonth}
      GROUP BY date_trunc('month', "date")
    ),
    "expense_monthly" AS (
      SELECT date_trunc('month', "date") AS "month", sum("amount")::numeric AS "expense"
      FROM "Expense"
      WHERE "userId" = ${userId}::uuid AND "date" >= ${startMonth}
      GROUP BY date_trunc('month', "date")
    ),
    "months" AS (
      SELECT generate_series(
        ${startMonth},
        date_trunc('month', ${now}),
        interval '1 month'
      ) AS "month"
    )
    SELECT
      m."month",
      COALESCE(i."income", 0)::text AS "income",
      COALESCE(e."expense", 0)::text AS "expense"
    FROM "months" m
    LEFT JOIN "income_monthly" i ON i."month" = m."month"
    LEFT JOIN "expense_monthly" e ON e."month" = m."month"
    ORDER BY m."month" ASC
  `);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);
  thirtyDaysAgo.setUTCHours(0, 0, 0, 0);

  const dailyRows = await prisma.$queryRaw<DailyTrendRow[]>(Prisma.sql`
    WITH "expense_daily" AS (
      SELECT "date", sum("amount")::numeric AS "expense"
      FROM "Expense"
      WHERE "userId" = ${userId}::uuid
        AND "date" >= ${thirtyDaysAgo}
        AND "date" <= ${now}
      GROUP BY "date"
    )
    SELECT d."date", COALESCE(e."expense", 0)::text AS "expense"
    FROM (
      SELECT generate_series(
        ${thirtyDaysAgo},
        date_trunc('day', ${now}),
        interval '1 day'
      )::date AS "date"
    ) d
    LEFT JOIN "expense_daily" e ON e."date" = d."date"
    ORDER BY d."date" ASC
  `);

  return {
    monthly: monthlyRows.map((row) => ({
      month: row.month.toISOString().slice(0, 7),
      income: Number(row.income),
      expense: Number(row.expense),
    })),
    daily: dailyRows.map((row) => ({
      date: row.date instanceof Date
        ? row.date.toISOString().slice(0, 10)
        : String(row.date).slice(0, 10),
      expense: Number(row.expense),
    })),
  };
};
