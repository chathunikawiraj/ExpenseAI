import type { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { AuthError } from './auth.service';
import {
  budgetScopeForExpense,
  recalculateBudgetScopes,
  runBudgetMonitoringTransaction,
} from './budget-monitoring.service';
import {
  drainReceiptStorageCleanupQueue,
  enqueueReceiptStorageCleanup,
  TEMPORARY_RECEIPT_TTL_MS,
} from './receipt-cleanup.service';
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

const createExpenseInTransaction = async (
  transaction: Prisma.TransactionClient,
  userId: string,
  input: CreateExpenseInput
) => {
  const expense = await transaction.expense.create({
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

  await recalculateBudgetScopes(transaction, userId, [
    budgetScopeForExpense(expense.date, expense.categoryId),
  ]);
  return expense;
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

  return runBudgetMonitoringTransaction(async (transaction) => {
    const expense = await createExpenseInTransaction(transaction, userId, input);
    return toExpenseResponse(expense);
  });
};

export const createExpenseWithReceipt = async (
  userId: string,
  receiptId: string,
  input: CreateExpenseInput
) => {
  await ensureCategoryAvailable(userId, input.categoryId);
  const uploadedAfter = new Date(Date.now() - TEMPORARY_RECEIPT_TTL_MS);

  return runBudgetMonitoringTransaction(async (transaction) => {
    const receipt = await transaction.receipt.findFirst({
      where: { id: receiptId, userId },
    });
    if (!receipt) {
      throw new AuthError('Receipt was not found.', 404, 'RECEIPT_NOT_FOUND');
    }
    if (receipt.expenseId) {
      throw new AuthError('Receipt has already been confirmed.', 409, 'RECEIPT_ALREADY_CONFIRMED');
    }
    if (receipt.uploadedAt < uploadedAfter) {
      throw new AuthError('Temporary receipt has expired.', 410, 'RECEIPT_EXPIRED');
    }

    const expense = await createExpenseInTransaction(transaction, userId, input);
    const attached = await transaction.receipt.updateMany({
      where: {
        id: receiptId,
        userId,
        expenseId: null,
        uploadedAt: { gte: uploadedAfter },
      },
      data: { expenseId: expense.id },
    });
    if (attached.count !== 1) {
      throw new AuthError(
        'Receipt has already been confirmed or expired.',
        409,
        'RECEIPT_NOT_ATTACHABLE'
      );
    }

    const confirmedReceipt = await transaction.receipt.findUniqueOrThrow({
      where: { id: receiptId },
    });
    return {
      expense: toExpenseResponse(expense),
      receipt: confirmedReceipt,
    };
  });
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

  return runBudgetMonitoringTransaction(async (transaction) => {
    const current = await transaction.expense.findFirst({
      where: { id: expenseId, userId },
    });
    if (!current) {
      throw new AuthError('Expense was not found.', 404, 'EXPENSE_NOT_FOUND');
    }

    const expense = await transaction.expense.update({
      where: { id: current.id },
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

    await recalculateBudgetScopes(transaction, userId, [
      budgetScopeForExpense(current.date, current.categoryId),
      budgetScopeForExpense(expense.date, expense.categoryId),
    ]);
    return toExpenseResponse(expense);
  });
};

export const deleteExpense = async (userId: string, expenseId: string) => {
  await runBudgetMonitoringTransaction(async (transaction) => {
    const expense = await transaction.expense.findFirst({
      where: { id: expenseId, userId },
      select: { id: true, date: true, categoryId: true },
    });
    if (!expense) {
      throw new AuthError('Expense was not found.', 404, 'EXPENSE_NOT_FOUND');
    }

    const receipt = await transaction.receipt.findFirst({
      where: { expenseId: expense.id },
    });
    if (receipt) {
      await enqueueReceiptStorageCleanup(transaction, receipt);
    }

    await transaction.expense.delete({ where: { id: expense.id } });
    await recalculateBudgetScopes(transaction, userId, [
      budgetScopeForExpense(expense.date, expense.categoryId),
    ]);
  });

  await drainReceiptStorageCleanupQueue().catch((error: unknown) => {
    console.error('[ExpenseAI receipt cleanup] Expense deletion cleanup remains queued:', error);
  });
};
