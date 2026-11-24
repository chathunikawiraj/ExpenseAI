import type { RequestHandler } from 'express';
import { getTransactions } from '../services/transaction.service';
import { transactionQuerySchema } from '../validators/transaction.validator';

export const listTransactions: RequestHandler = async (req, res) => {
  const parsedQuery = transactionQuerySchema.safeParse(req.query);
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

  const { transactions, total } = await getTransactions(
    req.authUser!.userId,
    parsedQuery.data
  );

  res.status(200).json({
    data: transactions,
    meta: {
      total,
      page: parsedQuery.data.page,
      limit: parsedQuery.data.limit,
      totalPages: Math.ceil(total / parsedQuery.data.limit),
    },
  });
};
