import prisma from '../config/database';

const insightResponse = (item: {
  id: string;
  userId: string;
  period: string;
  content: string;
  createdAt: Date;
}) => ({
  id: item.id,
  userId: item.userId,
  period: item.period,
  text: item.content,
  source: 'RULE' as const,
  createdAt: item.createdAt,
});

export const listInsights = async (userId: string) => {
  const items = await prisma.insight.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return items.map(insightResponse);
};

export const generateInsight = async (userId: string, period?: string) => {
  const selectedPeriod = period ?? new Date().toISOString().slice(0, 7);
  const [year, month] = selectedPeriod.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const expenseAggregate = await prisma.expense.aggregate({
    where: { userId, date: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  const incomeAggregate = await prisma.income.aggregate({
    where: { userId, date: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  const expenses = Number(expenseAggregate._sum.amount ?? 0);
  const income = Number(incomeAggregate._sum.amount ?? 0);
  const net = income - expenses;

  const topCategory = await prisma.expense.groupBy({
    by: ['categoryId'],
    where: { userId, date: { gte: start, lt: end } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: 1,
  });
  let content: string;
  if (topCategory.length > 0) {
    const category = await prisma.category.findUnique({
      where: { id: topCategory[0].categoryId },
      select: { name: true },
    });
    content = `During ${selectedPeriod}, spending was $${expenses.toFixed(2)} and income was $${income.toFixed(2)}. ${category?.name ?? 'Your largest category'} was the highest-spending category, with ${net >= 0 ? 'a positive' : 'a negative'} net cashflow of $${Math.abs(net).toFixed(2)}.`;
  } else {
    content = `During ${selectedPeriod}, no expenses were recorded. Income was $${income.toFixed(2)}.`;
  }

  const item = await prisma.insight.create({
    data: { userId, period: selectedPeriod, content },
  });
  return insightResponse(item);
};
