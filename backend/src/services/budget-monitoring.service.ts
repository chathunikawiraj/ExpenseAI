import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import prisma from '../config/database';

const THRESHOLDS = [50, 80, 100] as const;
const MAX_SERIALIZATION_RETRIES = 2;

type DatabaseClient = Prisma.TransactionClient | PrismaClient;
type BudgetWithCategory = Prisma.BudgetGetPayload<{ include: { category: true } }>;

export interface BudgetScope {
  month: Date;
  categoryId: string;
}

export interface BudgetThresholdTransitions {
  activate: number[];
  clear: number[];
}

const utcDate = (year: number, month: number, day: number): Date => {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month, day);
  return date;
};

const monthStart = (date: Date): Date =>
  utcDate(date.getUTCFullYear(), date.getUTCMonth(), 1);

const monthRange = (month: Date) => {
  const start = monthStart(month);
  return {
    start,
    end: utcDate(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
  };
};

export const budgetScopeForExpense = (date: Date, categoryId: string): BudgetScope => ({
  month: monthStart(date),
  categoryId,
});

export const calculateBudgetProgress = (
  budgetAmount: Prisma.Decimal,
  spent: Prisma.Decimal
) => {
  const remaining = budgetAmount.minus(spent);
  return {
    remaining: remaining.gt(0) ? remaining : new Prisma.Decimal(0),
    percentage: budgetAmount.gt(0)
      ? spent.div(budgetAmount).mul(100)
      : new Prisma.Decimal(0),
  };
};

export const planBudgetThresholdTransitions = (
  utilization: Prisma.Decimal,
  activeThresholds: number[]
): BudgetThresholdTransitions => ({
  activate: THRESHOLDS.filter(
    (threshold) => utilization.gte(threshold) && !activeThresholds.includes(threshold)
  ),
  clear: THRESHOLDS.filter(
    (threshold) => utilization.lt(threshold) && activeThresholds.includes(threshold)
  ),
});

const calculateBudget = async (
  client: DatabaseClient,
  userId: string,
  budget: BudgetWithCategory
) => {
  const range = monthRange(budget.month);
  const spentAggregate = await client.expense.aggregate({
    where: {
      userId,
      date: { gte: range.start, lt: range.end },
      ...(budget.categoryId ? { categoryId: budget.categoryId } : {}),
    },
    _sum: { amount: true },
  });
  const spent = spentAggregate._sum.amount ?? new Prisma.Decimal(0);
  const amount = budget.amount;
  const progress = calculateBudgetProgress(amount, spent);

  return {
    id: budget.id,
    userId: budget.userId,
    categoryId: budget.categoryId,
    category: budget.category,
    month: budget.month.toISOString().slice(0, 7),
    amount: amount.toNumber(),
    spent: spent.toNumber(),
    remaining: progress.remaining.toNumber(),
    percentage: progress.percentage.toNumber(),
    percentageDecimal: progress.percentage,
  };
};

const notificationForThreshold = (threshold: number, categoryName: string | null) => {
  const budgetName = categoryName
    ? `${categoryName} monthly budget`
    : 'overall monthly budget';

  if (threshold === 50) {
    return {
      type: 'BUDGET_50' as const,
      message: `You have used 50% of your ${budgetName}.`,
    };
  }
  if (threshold === 80) {
    return {
      type: 'BUDGET_80' as const,
      message: `Warning: You have used 80% of your ${budgetName}.`,
    };
  }
  return {
    type: 'BUDGET_100' as const,
    message: `You have reached or exceeded your ${budgetName}.`,
  };
};

const evaluateBudget = async (
  transaction: Prisma.TransactionClient,
  userId: string,
  budget: BudgetWithCategory
) => {
  const calculation = await calculateBudget(transaction, userId, budget);
  const events = await transaction.budgetThresholdEvent.findMany({
    where: { budgetId: budget.id, threshold: { in: [...THRESHOLDS] } },
    select: { threshold: true },
  });
  const transitions = planBudgetThresholdTransitions(
    calculation.percentageDecimal,
    events.map((event) => event.threshold)
  );

  if (transitions.clear.length > 0) {
    await transaction.budgetThresholdEvent.deleteMany({
      where: { budgetId: budget.id, threshold: { in: transitions.clear } },
    });
  }

  for (const threshold of transitions.activate) {
    const inserted = await transaction.budgetThresholdEvent.createMany({
      data: [{ budgetId: budget.id, threshold }],
      skipDuplicates: true,
    });
    if (inserted.count === 0) continue;

    const notification = notificationForThreshold(threshold, budget.category?.name ?? null);
    await transaction.notification.create({
      data: {
        userId,
        type: notification.type,
        message: notification.message,
      },
    });
  }

  const { percentageDecimal: _percentageDecimal, ...response } = calculation;
  return response;
};

export const getBudgetSnapshot = async (
  userId: string,
  budget: BudgetWithCategory,
  client: DatabaseClient = prisma
) => {
  const { percentageDecimal: _percentageDecimal, ...response } =
    await calculateBudget(client, userId, budget);
  return response;
};

export const recalculateBudgetById = async (
  transaction: Prisma.TransactionClient,
  userId: string,
  budgetId: string
) => {
  const budget = await transaction.budget.findFirst({
    where: { id: budgetId, userId },
    include: { category: true },
  });
  if (!budget) return null;
  return evaluateBudget(transaction, userId, budget);
};

export const recalculateBudgetScopes = async (
  transaction: Prisma.TransactionClient,
  userId: string,
  scopes: BudgetScope[]
) => {
  const uniqueScopes = new Map<string, BudgetScope>();
  for (const scope of scopes) {
    const month = monthStart(scope.month);
    uniqueScopes.set(`${month.toISOString().slice(0, 10)}:${scope.categoryId}`, {
      month,
      categoryId: scope.categoryId,
    });
  }
  if (uniqueScopes.size === 0) return [];

  const scopeFilters = [...uniqueScopes.values()].flatMap((scope) => [
    { month: scope.month, categoryId: null },
    { month: scope.month, categoryId: scope.categoryId },
  ]);
  const budgets = await transaction.budget.findMany({
    where: { userId, OR: scopeFilters },
    include: { category: true },
  });

  const results = [];
  for (const budget of budgets) {
    results.push(await evaluateBudget(transaction, userId, budget));
  }
  return results;
};

export const runSerializableTransaction = async <T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>
): Promise<T> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const isSerializationConflict =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
      if (!isSerializationConflict || attempt >= MAX_SERIALIZATION_RETRIES) throw error;
    }
  }
};

export const runBudgetMonitoringTransaction = runSerializableTransaction;
