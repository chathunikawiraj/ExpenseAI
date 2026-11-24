import type { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { AuthError } from './auth.service';
import type { UpsertBudgetInput } from '../validators/budget.validator';

const monthRange = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1)),
  };
};

const calculateBudget = async (
  userId: string,
  budget: Prisma.BudgetGetPayload<{ include: { category: true } }>
) => {
  const [year, monthNumber] = budget.month.toISOString().slice(0, 7).split('-').map(Number);
  const range = monthRange(`${year}-${String(monthNumber).padStart(2, '0')}`);
  const spentAggregate = await prisma.expense.aggregate({
    where: {
      userId,
      date: { gte: range.start, lt: range.end },
      ...(budget.categoryId ? { categoryId: budget.categoryId } : {}),
    },
    _sum: { amount: true },
  });
  const spent = Number(spentAggregate._sum.amount ?? 0);
  const amount = Number(budget.amount);
  return {
    id: budget.id,
    userId: budget.userId,
    categoryId: budget.categoryId,
    category: budget.category,
    month: budget.month.toISOString().slice(0, 7),
    amount,
    spent,
    remaining: Math.max(0, amount - spent),
    percentage: amount > 0 ? (spent / amount) * 100 : 0,
  };
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
  return Promise.all(budgets.map((budget) => calculateBudget(userId, budget)));
};

export const upsertBudget = async (userId: string, input: UpsertBudgetInput) => {
  const month = new Date(`${input.month}-01T00:00:00.000Z`);
  if (input.categoryId) {
    const category = await prisma.category.findFirst({
      where: {
        id: input.categoryId,
        OR: [{ userId: null, isDefault: true }, { userId, isDefault: false }],
      },
    });
    if (!category) throw new AuthError('Selected category is unavailable.', 400, 'INVALID_CATEGORY');
  }

  const existing = await prisma.budget.findFirst({
    where: { userId, month, categoryId: input.categoryId ?? null },
  });
  const budget = existing
    ? await prisma.budget.update({
        where: { id: existing.id },
        data: { amount: input.amount },
        include: { category: true },
      })
    : await prisma.budget.create({
        data: { userId, month, categoryId: input.categoryId ?? null, amount: input.amount },
        include: { category: true },
      });

  const result = await calculateBudget(userId, budget);
  for (const threshold of [50, 80, 100]) {
    if (result.percentage < threshold) continue;
    const thresholdEvent = await prisma.budgetThresholdEvent.findUnique({
      where: { budgetId_threshold: { budgetId: budget.id, threshold } },
    });
    await prisma.budgetThresholdEvent.upsert({
      where: { budgetId_threshold: { budgetId: budget.id, threshold } },
      update: {},
      create: { budgetId: budget.id, threshold },
    });
    if (thresholdEvent) continue;
    await prisma.notification.create({
      data: {
        userId,
        type: 'BUDGET_ALERT',
        message: threshold === 100
          ? `Budget utilization reached ${Math.round(result.percentage)}% for ${result.category?.name ?? 'your overall budget'}`
          : `Budget utilization reached ${threshold}% for ${result.category?.name ?? 'your overall budget'}`,
      },
    });
  }
  return result;
};

export const deleteBudget = async (userId: string, budgetId: string) => {
  const result = await prisma.budget.deleteMany({ where: { id: budgetId, userId } });
  if (result.count === 0) throw new AuthError('Budget was not found.', 404, 'BUDGET_NOT_FOUND');
};

const goalResponse = async (goal: {
  id: string;
  userId: string;
  name: string;
  targetAmount: Prisma.Decimal;
  targetDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) => {
  const aggregate = await prisma.savingsContribution.aggregate({
    where: { goalId: goal.id },
    _sum: { amount: true },
  });
  const savedAmount = Number(aggregate._sum.amount ?? 0);
  const targetAmount = Number(goal.targetAmount);
  return {
    id: goal.id,
    userId: goal.userId,
    name: goal.name,
    targetAmount,
    savedAmount,
    remainingAmount: Math.max(0, targetAmount - savedAmount),
    percentage: targetAmount > 0 ? (savedAmount / targetAmount) * 100 : 0,
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
  return Promise.all(goals.map(goalResponse));
};

export const createGoal = async (
  userId: string,
  input: {
    name: string;
    targetAmount: number;
    savedAmount?: number;
    targetDate?: Date;
  }
) => {
  const goal = await prisma.savingsGoal.create({
    data: {
      userId,
      name: input.name,
      targetAmount: input.targetAmount,
      targetDate: input.targetDate,
      ...(input.savedAmount && input.savedAmount > 0
        ? {
            contributions: {
              create: {
                amount: input.savedAmount,
                date: new Date(),
                note: 'Initial savings',
              },
            },
          }
        : {}),
    },
  });
  return goalResponse(goal);
};

export const updateGoal = async (
  userId: string,
  goalId: string,
  input: { name?: string; targetAmount?: number; targetDate?: Date | null }
) => {
  const existing = await prisma.savingsGoal.findFirst({
    where: { id: goalId, userId },
  });
  if (!existing) throw new AuthError('Savings goal was not found.', 404, 'GOAL_NOT_FOUND');
  const goal = await prisma.savingsGoal.update({
    where: { id: goalId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.targetAmount !== undefined ? { targetAmount: input.targetAmount } : {}),
      ...(input.targetDate !== undefined ? { targetDate: input.targetDate } : {}),
    },
  });
  return goalResponse(goal);
};

export const deleteGoal = async (userId: string, goalId: string) => {
  const result = await prisma.savingsGoal.deleteMany({ where: { id: goalId, userId } });
  if (result.count === 0) throw new AuthError('Savings goal was not found.', 404, 'GOAL_NOT_FOUND');
};

export const contributeToGoal = async (
  userId: string,
  goalId: string,
  input: { amount: number; date?: Date; note?: string }
) => {
  const goal = await prisma.savingsGoal.findFirst({ where: { id: goalId, userId } });
  if (!goal) throw new AuthError('Savings goal was not found.', 404, 'GOAL_NOT_FOUND');
  await prisma.savingsContribution.create({
    data: {
      goalId,
      amount: input.amount,
      date: input.date ?? new Date(),
      note: input.note,
    },
  });
  return goalResponse(goal);
};
