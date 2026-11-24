import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import type { TransactionQuery } from '../validators/transaction.validator';

interface UnifiedTransactionRow {
  id: string;
  type: 'income' | 'expense';
  title: string;
  amount: unknown;
  date: Date;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  categoryId: string | null;
  categoryName: string | null;
  paymentMethod: string | null;
  total: bigint;
}

const dateText = (value: Date) => value.toISOString().slice(0, 10);

const toUnifiedResponse = (row: UnifiedTransactionRow) => {
  const category =
    row.type === 'expense' && row.categoryId && row.categoryName
      ? { id: row.categoryId, name: row.categoryName }
      : undefined;

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    amount: Number(row.amount),
    date: dateText(row.date),
    description: row.description ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    categoryId: row.categoryId ?? undefined,
    category,
    paymentMethod: row.paymentMethod as
      | 'CASH'
      | 'CREDIT_CARD'
      | 'DEBIT_CARD'
      | 'BANK_TRANSFER'
      | 'OTHER'
      | null,
  };
};

export const getTransactions = async (
  userId: string,
  query: TransactionQuery
) => {
  const includeIncomes = query.type === 'all' || query.type === 'income';
  const includeExpenses = query.type === 'all' || query.type === 'expense';

  const incomeWhere = Prisma.sql`
    WHERE i."userId" = ${userId}::uuid
    ${query.startDate ? Prisma.sql`AND i."date" >= ${query.startDate}` : Prisma.empty}
    ${query.endDate ? Prisma.sql`AND i."date" <= ${query.endDate}` : Prisma.empty}
    ${
      query.search
        ? Prisma.sql`AND (i."source" ILIKE ${`%${query.search}%`} OR i."description" ILIKE ${`%${query.search}%`})`
        : Prisma.empty
    }
  `;

  const expenseWhere = Prisma.sql`
    WHERE e."userId" = ${userId}::uuid
    ${query.startDate ? Prisma.sql`AND e."date" >= ${query.startDate}` : Prisma.empty}
    ${query.endDate ? Prisma.sql`AND e."date" <= ${query.endDate}` : Prisma.empty}
    ${query.categoryId ? Prisma.sql`AND e."categoryId" = ${query.categoryId}::uuid` : Prisma.empty}
    ${query.paymentMethod ? Prisma.sql`AND e."paymentMethod" = ${query.paymentMethod}` : Prisma.empty}
    ${
      query.search
        ? Prisma.sql`AND (e."title" ILIKE ${`%${query.search}%`} OR e."description" ILIKE ${`%${query.search}%`})`
        : Prisma.empty
    }
  `;

  const unionBranches: Prisma.Sql[] = [];
  if (includeIncomes) {
    unionBranches.push(Prisma.sql`
      SELECT
        i."id"::text AS "id",
        'income'::text AS "type",
        i."source" AS "title",
        i."amount" AS "amount",
        i."date" AS "date",
        i."description" AS "description",
        i."createdAt" AS "createdAt",
        i."updatedAt" AS "updatedAt",
        NULL::text AS "categoryId",
        NULL::text AS "categoryName",
        NULL::text AS "paymentMethod"
      FROM "Income" i
      ${incomeWhere}
    `);
  }
  if (includeExpenses) {
    unionBranches.push(Prisma.sql`
      SELECT
        e."id"::text AS "id",
        'expense'::text AS "type",
        e."title" AS "title",
        e."amount" AS "amount",
        e."date" AS "date",
        e."description" AS "description",
        e."createdAt" AS "createdAt",
        e."updatedAt" AS "updatedAt",
        e."categoryId"::text AS "categoryId",
        c."name" AS "categoryName",
        e."paymentMethod" AS "paymentMethod"
      FROM "Expense" e
      JOIN "Category" c ON c."id" = e."categoryId"
      ${expenseWhere}
    `);
  }

  if (unionBranches.length === 0) {
    return { transactions: [], total: 0 };
  }

  const union = unionBranches.length === 1
    ? unionBranches[0]
    : Prisma.join(unionBranches, ' UNION ALL ');

  const direction = query.sortOrder === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  const sort =
    query.sortBy === 'amount'
      ? Prisma.sql`ORDER BY "amount" ${direction}, "date" ${direction}, "createdAt" ${direction}, "id" ASC`
      : query.sortBy === 'createdAt'
        ? Prisma.sql`ORDER BY "createdAt" ${direction}, "date" ${direction}, "id" ASC`
        : Prisma.sql`ORDER BY "date" ${direction}, "createdAt" ${direction}, "id" ASC`;

  const offset = (query.page - 1) * query.limit;
  const rows = await prisma.$queryRaw<UnifiedTransactionRow[]>(Prisma.sql`
    WITH "transactions" AS (
      ${union}
    )
    SELECT
      "id", "type", "title", "amount", "date", "description",
      "createdAt", "updatedAt", "categoryId", "categoryName", "paymentMethod",
      count(*) OVER() AS "total"
    FROM "transactions"
    ${sort}
    LIMIT ${query.limit}
    OFFSET ${offset}
  `);

  const total = rows.length > 0 ? Number(rows[0].total) : 0;
  return {
    transactions: rows.map(toUnifiedResponse),
    total,
  };
};
