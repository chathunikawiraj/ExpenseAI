import type { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { AuthError } from './auth.service';
import type {
  CreateIncomeInput,
  IncomeQuery,
  UpdateIncomeInput,
} from '../validators/income.validator';

const toIncomeResponse = (income: {
  id: string;
  userId: string;
  amount: Prisma.Decimal;
  source: string;
  description: string | null;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  ...income,
  amount: Number(income.amount),
  description: income.description ?? undefined,
});

export const getIncomes = async (userId: string, query: IncomeQuery) => {
  const where: Prisma.IncomeWhereInput = {
    userId,
    ...(query.source
      ? { source: { contains: query.source, mode: 'insensitive' } }
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

  const [incomes, total] = await Promise.all([
    prisma.income.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: query.limit,
    }),
    prisma.income.count({ where }),
  ]);

  return {
    incomes: incomes.map(toIncomeResponse),
    total,
  };
};

export const getIncome = async (userId: string, incomeId: string) => {
  const income = await prisma.income.findFirst({
    where: { id: incomeId, userId },
  });

  if (!income) {
    throw new AuthError('Income was not found.', 404, 'INCOME_NOT_FOUND');
  }

  return toIncomeResponse(income);
};

export const createIncome = async (userId: string, input: CreateIncomeInput) => {
  const income = await prisma.income.create({
    data: {
      userId,
      amount: input.amount,
      source: input.source,
      description: input.description,
      date: input.date,
    },
  });

  return toIncomeResponse(income);
};

export const updateIncome = async (
  userId: string,
  incomeId: string,
  input: UpdateIncomeInput
) => {
  const existingIncome = await prisma.income.findFirst({
    where: { id: incomeId, userId },
    select: { id: true },
  });

  if (!existingIncome) {
    throw new AuthError('Income was not found.', 404, 'INCOME_NOT_FOUND');
  }

  const income = await prisma.income.update({
    where: { id: incomeId },
    data: {
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.source !== undefined ? { source: input.source } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.date !== undefined ? { date: input.date } : {}),
    },
  });

  return toIncomeResponse(income);
};

export const deleteIncome = async (userId: string, incomeId: string) => {
  const result = await prisma.income.deleteMany({
    where: { id: incomeId, userId },
  });

  if (result.count === 0) {
    throw new AuthError('Income was not found.', 404, 'INCOME_NOT_FOUND');
  }
};
