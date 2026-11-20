import type { RequestHandler } from 'express';
import {
  createExpense,
  deleteExpense,
  getExpense,
  getExpenses,
  updateExpense,
} from '../services/expense.service';
import { expenseQuerySchema } from '../validators/expense.validator';

export const listExpenses: RequestHandler = async (req, res) => {
  const parsedQuery = expenseQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: 'Validation failed.',
      details: parsedQuery.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  const { expenses, total } = await getExpenses(
    req.authUser!.userId,
    parsedQuery.data
  );

  res.status(200).json({
    data: expenses,
    meta: {
      total,
      page: parsedQuery.data.page,
      limit: parsedQuery.data.limit,
      totalPages: Math.ceil(total / parsedQuery.data.limit),
    },
  });
};

export const readExpense: RequestHandler = async (req, res) => {
  const expense = await getExpense(req.authUser!.userId, req.params.id as string);
  res.status(200).json(expense);
};

export const addExpense: RequestHandler = async (req, res) => {
  const expense = await createExpense(req.authUser!.userId, req.body);
  res.status(201).json(expense);
};

export const editExpense: RequestHandler = async (req, res) => {
  const expense = await updateExpense(
    req.authUser!.userId,
    req.params.id as string,
    req.body
  );
  res.status(200).json(expense);
};

export const removeExpense: RequestHandler = async (req, res) => {
  await deleteExpense(req.authUser!.userId, req.params.id as string);
  res.status(200).json({ message: 'Expense deleted successfully.' });
};
