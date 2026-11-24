import type { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { AuthError } from './auth.service';
import type {
  CreateExpenseInput,
  ExpenseQuery,
  UpdateExpenseInput,
} from '../validators/expense.validator';

type ExpenseWithCategory = Prisma.ExpenseGetPayload<{
  include: { category: true };
}>;

const toExpenseResponse = (expense: ExpenseWithCategory) => ({
  ...expense,
  amount: Number(expense.amount),
  description: expense.description ?? undefined,
});

const ensureCategoryAvailable = async (userId: string, categoryId: string) => {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      OR: [
        { userId: null, isDefault: true },
        { userId, isDefault: false },
      ],
    },
    select: { id: true },
  });

  if (!category) {
    throw new AuthError(
      'Selected category was not found or is unavailable.',
      400,
      'INVALID_CATEGORY'
    );
  }
};

export const getExpenses = async (userId: string, query: ExpenseQuery) => {
  const where: Prisma.ExpenseWhereInput = {
    userId,
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(query.startDate || query.endDate
      ? {
          date: {
            ...(query.startDate ? { gte: query.startDate } : {}),
            ...(query.endDate ? { lte: query.endDate } : {}),
          },
        }
      : {}),
  };
  const skip = (query.page - 1) * query.limit;
  const orderBy: Prisma.ExpenseOrderByWithRelationInput =
    query.sortBy === 'amount'
      ? { amount: query.sortOrder }
      : query.sortBy === 'createdAt'
        ? { createdAt: query.sortOrder }
        : { date: query.sortOrder };

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { category: true },
      orderBy,
      skip,
      take: query.limit,
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    expenses: expenses.map(toExpenseResponse),
    total,
  };
};

export const getExpense = async (userId: string, expenseId: string) => {
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, userId },
    include: { category: true },
  });

  if (!expense) {
    throw new AuthError('Expense was not found.', 404, 'EXPENSE_NOT_FOUND');
  }

  return toExpenseResponse(expense);
};

export const createExpense = async (
  userId: string,
  input: CreateExpenseInput
) => {
  await ensureCategoryAvailable(userId, input.categoryId);

  const expense = await prisma.expense.create({
    data: {
      userId,
      title: input.title,
      amount: input.amount,
      date: input.date,
      categoryId: input.categoryId,
      paymentMethod: input.paymentMethod,
      description: input.description,
    },
    include: { category: true },
  });

  return toExpenseResponse(expense);
};

export const updateExpense = async (
  userId: string,
  expenseId: string,
  input: UpdateExpenseInput
) => {
  const existingExpense = await prisma.expense.findFirst({
    where: { id: expenseId, userId },
    select: { id: true },
  });

  if (!existingExpense) {
    throw new AuthError('Expense was not found.', 404, 'EXPENSE_NOT_FOUND');
  }

  if (input.categoryId) {
    await ensureCategoryAvailable(userId, input.categoryId);
  }

  const expense = await prisma.expense.update({
    where: { id: expenseId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.date !== undefined ? { date: input.date } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.paymentMethod !== undefined ? { paymentMethod: input.paymentMethod } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    },
    include: { category: true },
  });

  return toExpenseResponse(expense);
};

export const deleteExpense = async (userId: string, expenseId: string) => {
  const result = await prisma.expense.deleteMany({
    where: { id: expenseId, userId },
  });

  if (result.count === 0) {
    throw new AuthError('Expense was not found.', 404, 'EXPENSE_NOT_FOUND');
  }
};
