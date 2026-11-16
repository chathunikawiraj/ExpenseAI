import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { dbStore } from '../data/store';

export class AnalyticsController {
  // GET /analytics/summary (FR-23)
  static async getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { month = new Date().toISOString().substring(0, 7) } = req.query;

    const userIncomes = dbStore.incomes.filter(
      (i) => i.userId === userId && i.date.toISOString().substring(0, 7) === month
    );
    const userExpenses = dbStore.expenses.filter(
      (e) => e.userId === userId && e.date.toISOString().substring(0, 7) === month
    );

    const totalIncome = userIncomes.reduce((sum, curr) => sum + curr.amount, 0);
    const totalExpenses = userExpenses.reduce((sum, curr) => sum + curr.amount, 0);
    const currentBalance = totalIncome - totalExpenses;

    const overallBudget = dbStore.budgets.find(
      (b) => b.userId === userId && b.month === month && b.categoryId === null
    );
    const budgetAmount = overallBudget ? overallBudget.amount : 0;
    const budgetUsagePercentage = budgetAmount > 0 ? Math.min(Math.round((totalExpenses / budgetAmount) * 100), 100) : 0;

    // Recent 5 transactions
    const recent = [...userExpenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map((e) => {
        const cat = dbStore.categories.find((c) => c.id === e.categoryId);
        return {
          ...e,
          categoryName: cat?.name || 'General',
          categoryColor: cat?.color || '#6C5CE7',
        };
      });

    res.status(200).json({
      period: month,
      totalIncome: parseFloat(totalIncome.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      currentBalance: parseFloat(currentBalance.toFixed(2)),
      totalBudget: budgetAmount,
      budgetUsagePercentage,
      recentTransactions: recent,
    });
  }

  // GET /analytics/trends (FR-24, FR-25)
  static async getTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;

    // Category breakdown
    const categoryTotals: Record<string, { name: string; amount: number; color: string }> = {};
    dbStore.expenses
      .filter((e) => e.userId === userId)
      .forEach((e) => {
        const cat = dbStore.categories.find((c) => c.id === e.categoryId);
        const name = cat?.name || 'Other';
        const color = cat?.color || '#6C5CE7';

        if (!categoryTotals[name]) {
          categoryTotals[name] = { name, amount: 0, color };
        }
        categoryTotals[name].amount += e.amount;
      });

    // Month-over-Month 4-month comparison
    const months = ['2026-06', '2026-07', '2026-08', '2026-09'];
    const momData = months.map((m) => {
      const inc = dbStore.incomes
        .filter((i) => i.userId === userId && i.date.toISOString().substring(0, 7) === m)
        .reduce((sum, curr) => sum + curr.amount, 0);
      const exp = dbStore.expenses
        .filter((e) => e.userId === userId && e.date.toISOString().substring(0, 7) === m)
        .reduce((sum, curr) => sum + curr.amount, 0);

      const label = new Date(`${m}-01`).toLocaleString('en-US', { month: 'short' });
      return { month: label, income: inc, expense: exp };
    });

    res.status(200).json({
      categoryBreakdown: Object.values(categoryTotals),
      momData,
    });
  }

  // GET /reports/:month (FR-26)
  static async getMonthlyReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { month } = req.params;

    const user = dbStore.users.find((u) => u.id === userId);
    const monthIncomes = dbStore.incomes.filter(
      (i) => i.userId === userId && i.date.toISOString().substring(0, 7) === month
    );
    const monthExpenses = dbStore.expenses.filter(
      (e) => e.userId === userId && e.date.toISOString().substring(0, 7) === month
    );

    const totalIncome = monthIncomes.reduce((sum, curr) => sum + curr.amount, 0);
    const totalExpense = monthExpenses.reduce((sum, curr) => sum + curr.amount, 0);

    const budgets = dbStore.budgets.filter((b) => b.userId === userId && b.month === month);
    const goals = dbStore.savingsGoals.filter((g) => g.userId === userId);

    res.status(200).json({
      month,
      user: { name: user?.name, email: user?.email, currency: user?.currency },
      totalIncome: parseFloat(totalIncome.toFixed(2)),
      totalExpense: parseFloat(totalExpense.toFixed(2)),
      netSavings: parseFloat((totalIncome - totalExpense).toFixed(2)),
      budgets,
      goals,
      incomes: monthIncomes,
      expenses: monthExpenses,
    });
  }

  // GET /export/csv (FR-28, FR-29)
  static async exportCsv(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { startDate, endDate } = req.query;

    let incomes = dbStore.incomes.filter((i) => i.userId === userId);
    let expenses = dbStore.expenses.filter((e) => e.userId === userId);

    if (startDate) {
      incomes = incomes.filter((i) => new Date(i.date) >= new Date(startDate as string));
      expenses = expenses.filter((e) => new Date(e.date) >= new Date(startDate as string));
    }
    if (endDate) {
      incomes = incomes.filter((i) => new Date(i.date) <= new Date(endDate as string));
      expenses = expenses.filter((e) => new Date(e.date) <= new Date(endDate as string));
    }

    // Formula injection neutralization (FR-29): values starting with =, +, -, @ are prefixed with '
    const sanitize = (val: any) => {
      const str = String(val ?? '').trim();
      if (/^[=+\-@]/.test(str)) {
        return `'${str}`;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = ['Date', 'Type', 'Category / Source', 'Amount', 'Payment Method', 'Description'];
    const rows: string[][] = [];

    incomes.forEach((i) => {
      rows.push([
        i.date.toISOString().substring(0, 10),
        'Income',
        i.source,
        i.amount.toFixed(2),
        'Direct Deposit',
        i.description || '',
      ]);
    });

    expenses.forEach((e) => {
      const cat = dbStore.categories.find((c) => c.id === e.categoryId);
      rows.push([
        e.date.toISOString().substring(0, 10),
        'Expense',
        cat?.name || 'General',
        e.amount.toFixed(2),
        e.paymentMethod,
        e.description || '',
      ]);
    });

    const csvBody = [
      headers.map(sanitize).join(','),
      ...rows.map((row) => row.map(sanitize).join(',')),
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ExpenseAI_Report.csv"');
    res.status(200).send(csvBody);
  }
}
