import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { AuthError } from './auth.service';
import {
  getBudgetSnapshot,
  recalculateBudgetById,
  runBudgetMonitoringTransaction,
  runSerializableTransaction,
} from './budget-monitoring.service';
import type { UpdateBudgetInput, UpsertBudgetInput } from '../validators/budget.validator';
import type { ContributionQuery } from '../validators/goal.validator';

const validateBudgetCategory = async (
  userId: string,
  categoryId: string | null | undefined,
  client: Prisma.TransactionClient | typeof prisma = prisma
) => {
  if (!categoryId) return;
  const category = await client.category.findFirst({
    where: {
      id: categoryId,
      OR: [{ userId: null, isDefault: true }, { userId }],
    },
  });
  if (!category) throw new AuthError('Selected category is unavailable.', 400, 'INVALID_CATEGORY');
};

export const listBudgets = async (userId: string, month?: string) => {
  const budgets = await prisma.budget.findMany({
    where: {
      userId,
      ...(month ? { month: new Date(`${month}-01T00:00:00.000Z`) } : {}),
    },
    include: { category: true },
    orderBy: [{ month: 'desc' }, { createdAt: 'asc' }],
  });
  return Promise.all(budgets.map((budget) => getBudgetSnapshot(userId, budget)));
};

export const upsertBudget = async (userId: string, input: UpsertBudgetInput) => {
  const month = new Date(`${input.month}-01T00:00:00.000Z`);

  try {
    return await runBudgetMonitoringTransaction(async (transaction) => {
      await validateBudgetCategory(userId, input.categoryId, transaction);
      const existing = await transaction.budget.findFirst({
        where: { userId, month, categoryId: input.categoryId ?? null },
        select: { id: true },
      });
      const budget = existing
        ? await transaction.budget.update({
            where: { id: existing.id },
            data: { amount: input.amount },
            include: { category: true },
          })
        : await transaction.budget.create({
            data: { userId, month, categoryId: input.categoryId ?? null, amount: input.amount },
            include: { category: true },
          });
      const result = await recalculateBudgetById(transaction, userId, budget.id);
      if (!result) throw new AuthError('Budget was not found.', 404, 'BUDGET_NOT_FOUND');
      return result;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AuthError(
        'A budget already exists for this month and category.',
        409,
        'BUDGET_ALREADY_EXISTS'
      );
    }
    throw error;
  }
};

export const getBudget = async (userId: string, budgetId: string) => {
  const budget = await prisma.budget.findFirst({
    where: { id: budgetId, userId },
    include: { category: true },
  });
  if (!budget) throw new AuthError('Budget was not found.', 404, 'BUDGET_NOT_FOUND');
  return getBudgetSnapshot(userId, budget);
};

export const updateBudget = async (
  userId: string,
  budgetId: string,
  input: UpdateBudgetInput
) => {
  const existing = await prisma.budget.findFirst({
    where: { id: budgetId, userId },
  });
  if (!existing) throw new AuthError('Budget was not found.', 404, 'BUDGET_NOT_FOUND');

  try {
    return await runBudgetMonitoringTransaction(async (transaction) => {
      const current = await transaction.budget.findFirst({
        where: { id: budgetId, userId },
      });
      if (!current) throw new AuthError('Budget was not found.', 404, 'BUDGET_NOT_FOUND');

      const categoryId = input.categoryId === undefined ? current.categoryId : input.categoryId;
      const month = input.month
        ? new Date(`${input.month}-01T00:00:00.000Z`)
        : current.month;
      await validateBudgetCategory(userId, categoryId, transaction);
      const scopeChanged =
        current.categoryId !== categoryId ||
        current.month.getTime() !== month.getTime();
      const budget = await transaction.budget.update({
        where: { id: current.id },
        data: {
          categoryId,
          month,
          amount: input.amount ?? current.amount,
        },
        include: { category: true },
      });
      if (scopeChanged) {
        await transaction.budgetThresholdEvent.deleteMany({
          where: { budgetId: budget.id },
        });
      }

      const result = await recalculateBudgetById(transaction, userId, budget.id);
      if (!result) throw new AuthError('Budget was not found.', 404, 'BUDGET_NOT_FOUND');
      return result;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AuthError(
        'A budget already exists for this month and category.',
        409,
        'BUDGET_ALREADY_EXISTS'
      );
    }
    throw error;
  }
};

export const deleteBudget = async (userId: string, budgetId: string) => {
  const result = await prisma.budget.deleteMany({ where: { id: budgetId, userId } });
  if (result.count === 0) throw new AuthError('Budget was not found.', 404, 'BUDGET_NOT_FOUND');
};

type SavingsDatabaseClient = Prisma.TransactionClient | typeof prisma;

export const calculateSavingsGoalProgress = (
  targetAmount: Prisma.Decimal,
  savedAmount: Prisma.Decimal
) => {
  const nonNegativeSavedAmount = savedAmount.gt(0) ? savedAmount : new Prisma.Decimal(0);
  const remainingAmount = targetAmount.minus(nonNegativeSavedAmount);
  const rawPercentage = targetAmount.gt(0)
    ? nonNegativeSavedAmount.div(targetAmount).mul(100)
    : new Prisma.Decimal(0);
  return {
    savedAmount: nonNegativeSavedAmount,
    remainingAmount: remainingAmount.gt(0) ? remainingAmount : new Prisma.Decimal(0),
    percentage: rawPercentage.gt(100) ? new Prisma.Decimal(100) : rawPercentage,
    isCompleted: targetAmount.gt(0) && nonNegativeSavedAmount.gte(targetAmount),
  };
};

export const shouldNotifyGoalCompletion = (
  wasCompleted: boolean,
  isCompleted: boolean
) => !wasCompleted && isCompleted;

const goalResponse = async (
  goal: Prisma.SavingsGoalGetPayload<{}>,
  client: SavingsDatabaseClient = prisma
) => {
  const aggregate = await client.savingsContribution.aggregate({
    where: { goalId: goal.id },
    _sum: { amount: true },
  });
  const progress = calculateSavingsGoalProgress(
    goal.targetAmount,
    aggregate._sum.amount ?? new Prisma.Decimal(0)
  );
  return {
    id: goal.id,
    userId: goal.userId,
    name: goal.name,
    targetAmount: goal.targetAmount.toNumber(),
    savedAmount: progress.savedAmount.toNumber(),
    remainingAmount: progress.remainingAmount.toNumber(),
    percentage: progress.percentage.toNumber(),
    isCompleted: progress.isCompleted,
    targetDate: goal.targetDate?.toISOString().slice(0, 10) ?? null,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
};

export const listGoals = async (userId: string) => {
  const goals = await prisma.savingsGoal.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return Promise.all(goals.map((goal) => goalResponse(goal)));
};

export const getGoal = async (userId: string, goalId: string) => {
  const goal = await prisma.savingsGoal.findFirst({
    where: { id: goalId, userId },
  });
  if (!goal) throw new AuthError('Savings goal was not found.', 404, 'GOAL_NOT_FOUND');
  return goalResponse(goal);
};

const notifyContribution = async (
  transaction: Prisma.TransactionClient,
  userId: string,
  goal: Prisma.SavingsGoalGetPayload<{}>,
  amount: Prisma.Decimal
) => {
  await transaction.notification.create({
    data: {
      userId,
      type: 'SAVINGS_UPDATE',
      message: `A contribution of $${amount.toFixed(2)} was added to "${goal.name}".`,
    },
  });
};

const notifyGoalCompleted = async (
  transaction: Prisma.TransactionClient,
  userId: string,
  goal: Prisma.SavingsGoalGetPayload<{}>
) => {
  await transaction.notification.create({
    data: {
      userId,
      type: 'GOAL_COMPLETED',
      message: `Congratulations! You completed the "${goal.name}" savings goal.`,
    },
  });
};

export const createGoal = async (
  userId: string,
  input: {
    name: string;
    targetAmount: Prisma.Decimal;
    savedAmount?: Prisma.Decimal;
    targetDate?: Date;
  }
) => {
  return runSerializableTransaction(async (transaction) => {
    const goal = await transaction.savingsGoal.create({
      data: {
        userId,
        name: input.name,
        targetAmount: input.targetAmount,
        targetDate: input.targetDate,
      },
    });
    const initialSavedAmount = input.savedAmount ?? new Prisma.Decimal(0);
    if (initialSavedAmount.gt(0)) {
      await transaction.savingsContribution.create({
        data: {
          goalId: goal.id,
          amount: initialSavedAmount,
          date: new Date(),
          note: 'Initial savings',
        },
      });
      await notifyContribution(transaction, userId, goal, initialSavedAmount);
    }

    const response = await goalResponse(goal, transaction);
    if (shouldNotifyGoalCompletion(false, response.isCompleted)) {
      await notifyGoalCompleted(transaction, userId, goal);
    }
    return response;
  });
};

export const updateGoal = async (
  userId: string,
  goalId: string,
  input: { name?: string; targetAmount?: Prisma.Decimal; targetDate?: Date | null }
) => {
  return runSerializableTransaction(async (transaction) => {
    const existing = await transaction.savingsGoal.findFirst({
      where: { id: goalId, userId },
    });
    if (!existing) throw new AuthError('Savings goal was not found.', 404, 'GOAL_NOT_FOUND');
    const previous = await goalResponse(existing, transaction);
    const goal = await transaction.savingsGoal.update({
      where: { id: goalId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.targetAmount !== undefined ? { targetAmount: input.targetAmount } : {}),
        ...(input.targetDate !== undefined ? { targetDate: input.targetDate } : {}),
      },
    });
    const response = await goalResponse(goal, transaction);
    if (shouldNotifyGoalCompletion(previous.isCompleted, response.isCompleted)) {
      await notifyGoalCompleted(transaction, userId, goal);
    }
    return response;
  });
};

export const deleteGoal = async (userId: string, goalId: string) => {
  const result = await prisma.savingsGoal.deleteMany({ where: { id: goalId, userId } });
  if (result.count === 0) throw new AuthError('Savings goal was not found.', 404, 'GOAL_NOT_FOUND');
};

export const contributeToGoal = async (
  userId: string,
  goalId: string,
  input: { amount: Prisma.Decimal; date?: Date; note?: string }
) => {
  return runSerializableTransaction(async (transaction) => {
    const goal = await transaction.savingsGoal.findFirst({ where: { id: goalId, userId } });
    if (!goal) throw new AuthError('Savings goal was not found.', 404, 'GOAL_NOT_FOUND');
    const previous = await goalResponse(goal, transaction);

    await transaction.savingsContribution.create({
      data: {
        goalId,
        amount: input.amount,
        date: input.date ?? new Date(),
        note: input.note,
      },
    });
    await notifyContribution(transaction, userId, goal, input.amount);
    const response = await goalResponse(goal, transaction);
    if (shouldNotifyGoalCompletion(previous.isCompleted, response.isCompleted)) {
      await notifyGoalCompleted(transaction, userId, goal);
    }
    return response;
  });
};

export const listGoalContributions = async (
  userId: string,
  goalId: string,
  query: ContributionQuery
) => {
  const goal = await prisma.savingsGoal.findFirst({
    where: { id: goalId, userId },
    select: { id: true },
  });
  if (!goal) throw new AuthError('Savings goal was not found.', 404, 'GOAL_NOT_FOUND');

  const skip = (query.page - 1) * query.limit;
  const [contributions, total] = await Promise.all([
    prisma.savingsContribution.findMany({
      where: { goalId: goal.id },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: query.limit,
    }),
    prisma.savingsContribution.count({ where: { goalId: goal.id } }),
  ]);
  return {
    data: contributions.map((contribution) => ({
      id: contribution.id,
      goalId: contribution.goalId,
      amount: contribution.amount.toNumber(),
      date: contribution.date.toISOString().slice(0, 10),
      note: contribution.note,
      createdAt: contribution.createdAt,
    })),
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};
