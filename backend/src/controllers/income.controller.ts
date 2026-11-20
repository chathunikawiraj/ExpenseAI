import type { RequestHandler } from 'express';
import {
  createIncome,
  deleteIncome,
  getIncome,
  getIncomes,
  updateIncome,
} from '../services/income.service';
import { incomeQuerySchema } from '../validators/income.validator';

export const listIncomes: RequestHandler = async (req, res) => {
  const parsedQuery = incomeQuerySchema.safeParse(req.query);
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

  const { incomes, total } = await getIncomes(req.authUser!.userId, parsedQuery.data);

  res.status(200).json({
    data: incomes,
    meta: {
      total,
      page: parsedQuery.data.page,
      limit: parsedQuery.data.limit,
      totalPages: Math.ceil(total / parsedQuery.data.limit),
    },
  });
};

export const readIncome: RequestHandler = async (req, res) => {
  const income = await getIncome(req.authUser!.userId, req.params.id as string);
  res.status(200).json(income);
};

export const addIncome: RequestHandler = async (req, res) => {
  const income = await createIncome(req.authUser!.userId, req.body);
  res.status(201).json(income);
};

export const editIncome: RequestHandler = async (req, res) => {
  const income = await updateIncome(
    req.authUser!.userId,
    req.params.id as string,
    req.body
  );
  res.status(200).json(income);
};

export const removeIncome: RequestHandler = async (req, res) => {
  await deleteIncome(req.authUser!.userId, req.params.id as string);
  res.status(200).json({ message: 'Income deleted successfully.' });
};
