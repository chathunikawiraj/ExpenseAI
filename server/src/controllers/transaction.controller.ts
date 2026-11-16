import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { dbStore, DBExpense, DBIncome, DBCategory } from '../data/store';

export class TransactionController {
  // GET /incomes (FR-09)
  static async getIncomes(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { startDate, endDate, source, page = '1', limit = '20' } = req.query;

    let items = dbStore.incomes.filter((i) => i.userId === userId);

    if (startDate) {
      items = items.filter((i) => new Date(i.date) >= new Date(startDate as string));
    }
    if (endDate) {
      items = items.filter((i) => new Date(i.date) <= new Date(endDate as string));
    }
    if (source) {
      items = items.filter((i) => i.source.toLowerCase().includes((source as string).toLowerCase()));
    }

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const total = items.length;
    const paginated = items.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.status(200).json({
      data: paginated,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  }

  // POST /incomes (FR-08)
  static async createIncome(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { source, amount, date, description, recurring } = req.body;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      res.status(400).json({ error: 'Amount must be a positive number.' });
      return;
    }

    const newIncome: DBIncome = {
      id: `inc_${Date.now()}`,
      userId,
      source: source.trim(),
      amount: amountNum,
      date: new Date(date || Date.now()),
      description: description?.trim() || null,
      recurring: recurring || 'NONE',
      createdAt: new Date(),
    };

    dbStore.incomes.push(newIncome);
    res.status(201).json(newIncome);
  }

  // PUT /incomes/:id (FR-08)
  static async updateIncome(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id } = req.params;
    const income = dbStore.incomes.find((i) => i.id === id && i.userId === userId);

    if (!income) {
      res.status(404).json({ error: 'Income record not found.' });
      return;
    }

    const { source, amount, date, description, recurring } = req.body;
    if (source) income.source = source.trim();
    if (amount) income.amount = parseFloat(amount);
    if (date) income.date = new Date(date);
    if (description !== undefined) income.description = description ? description.trim() : null;
    if (recurring) income.recurring = recurring;

    res.status(200).json(income);
  }

  // DELETE /incomes/:id (FR-08)
  static async deleteIncome(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id } = req.params;
    const index = dbStore.incomes.findIndex((i) => i.id === id && i.userId === userId);

    if (index === -1) {
      res.status(404).json({ error: 'Income record not found.' });
      return;
    }

    dbStore.incomes.splice(index, 1);
    res.status(200).json({ message: 'Income record deleted.' });
  }

  // GET /expenses (FR-11)
  static async getExpenses(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { search, categoryId, paymentMethod, startDate, endDate, sortBy = 'date', sortOrder = 'desc', page = '1', limit = '20' } = req.query;

    let items = dbStore.expenses.filter((e) => e.userId === userId);

    if (search) {
      const term = (search as string).toLowerCase();
      items = items.filter(
        (e) => e.title.toLowerCase().includes(term) || (e.description && e.description.toLowerCase().includes(term))
      );
    }
    if (categoryId && categoryId !== 'all') {
      items = items.filter((e) => e.categoryId === categoryId);
    }
    if (paymentMethod && paymentMethod !== 'all') {
      items = items.filter((e) => e.paymentMethod === paymentMethod);
    }
    if (startDate) {
      items = items.filter((e) => new Date(e.date) >= new Date(startDate as string));
    }
    if (endDate) {
      items = items.filter((e) => new Date(e.date) <= new Date(endDate as string));
    }

    // Sorting
    items.sort((a, b) => {
      if (sortBy === 'amount') {
        return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      } else {
        const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
        return sortOrder === 'desc' ? diff : -diff;
      }
    });

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const total = items.length;
    const paginated = items.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    // Populate category metadata
    const populated = paginated.map((exp) => {
      const cat = dbStore.categories.find((c) => c.id === exp.categoryId);
      return {
        ...exp,
        category: cat ? { id: cat.id, name: cat.name, color: cat.color, icon: cat.icon } : null,
      };
    });

    res.status(200).json({
      data: populated,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  }

  // POST /expenses (FR-10, FR-16: triggers budget threshold alert)
  static async createExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { title, amount, date, categoryId, paymentMethod, description, recurring } = req.body;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      res.status(400).json({ error: 'Amount must be positive.' });
      return;
    }

    const newExpense: DBExpense = {
      id: `exp_${Date.now()}`,
      userId,
      title: title.trim(),
      amount: amountNum,
      date: new Date(date || Date.now()),
      categoryId: categoryId || 'cat_08',
      paymentMethod: paymentMethod || 'DEBIT_CARD',
      description: description ? description.trim() : null,
      recurring: recurring || 'NONE',
      createdAt: new Date(),
    };

    dbStore.expenses.push(newExpense);

    // Evaluate budget thresholds (FR-16)
    const expenseMonth = newExpense.date.toISOString().substring(0, 7);
    TransactionController.evaluateThresholds(userId, expenseMonth, newExpense.categoryId);

    res.status(201).json(newExpense);
  }

  // PUT /expenses/:id (FR-10)
  static async updateExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id } = req.params;
    const expense = dbStore.expenses.find((e) => e.id === id && e.userId === userId);

    if (!expense) {
      res.status(404).json({ error: 'Expense not found.' });
      return;
    }

    const { title, amount, date, categoryId, paymentMethod, description, recurring } = req.body;
    if (title) expense.title = title.trim();
    if (amount) expense.amount = parseFloat(amount);
    if (date) expense.date = new Date(date);
    if (categoryId) expense.categoryId = categoryId;
    if (paymentMethod) expense.paymentMethod = paymentMethod;
    if (description !== undefined) expense.description = description ? description.trim() : null;
    if (recurring) expense.recurring = recurring;

    const expenseMonth = expense.date.toISOString().substring(0, 7);
    TransactionController.evaluateThresholds(userId, expenseMonth, expense.categoryId);

    res.status(200).json(expense);
  }

  // DELETE /expenses/:id (FR-10)
  static async deleteExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id } = req.params;
    const index = dbStore.expenses.findIndex((e) => e.id === id && e.userId === userId);

    if (index === -1) {
      res.status(404).json({ error: 'Expense not found.' });
      return;
    }

    dbStore.expenses.splice(index, 1);
    res.status(200).json({ message: 'Expense deleted.' });
  }

  // GET /categories (FR-12)
  static async getCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    // Return predefined defaults + user's custom categories
    const categories = dbStore.categories.filter((c) => c.isDefault || (userId && c.userId === userId));
    res.status(200).json(categories);
  }

  // POST /categories (FR-12)
  static async createCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { name, color, icon } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }

    const newCat: DBCategory = {
      id: `cat_custom_${Date.now()}`,
      name: name.trim(),
      isDefault: false,
      userId,
      color: color || '#6C5CE7',
      icon: icon || 'Tag',
      createdAt: new Date(),
    };

    dbStore.categories.push(newCat);
    res.status(201).json(newCat);
  }

  // Helper: Budget Threshold Alert Trigger (50%, 80%, 100% - FR-16)
  private static evaluateThresholds(userId: string, month: string, categoryId: string) {
    const budgets = dbStore.budgets.filter(
      (b) => b.userId === userId && b.month === month && (b.categoryId === null || b.categoryId === categoryId)
    );

    budgets.forEach((budget) => {
      // Calculate total spend for this budget
      let matchingExpenses = dbStore.expenses.filter((e) => {
        const eMonth = e.date.toISOString().substring(0, 7);
        return e.userId === userId && eMonth === month;
      });

      if (budget.categoryId) {
        matchingExpenses = matchingExpenses.filter((e) => e.categoryId === budget.categoryId);
      }

      const totalSpent = matchingExpenses.reduce((sum, curr) => sum + curr.amount, 0);
      const ratio = totalSpent / budget.amount;

      let alertType: string | null = null;
      let msg = '';

      if (ratio >= 1.0) {
        alertType = `BUDGET_100_${budget.id}`;
        msg = `Your ${budget.categoryId ? 'category' : 'overall'} budget has exceeded 100% ($${totalSpent.toFixed(2)} of $${budget.amount.toFixed(2)})!`;
      } else if (ratio >= 0.8) {
        alertType = `BUDGET_80_${budget.id}`;
        msg = `Your ${budget.categoryId ? 'category' : 'overall'} budget reached 80% threshold ($${totalSpent.toFixed(2)} of $${budget.amount.toFixed(2)}).`;
      } else if (ratio >= 0.5) {
        alertType = `BUDGET_50_${budget.id}`;
        msg = `Your ${budget.categoryId ? 'category' : 'overall'} budget reached 50% milestone ($${totalSpent.toFixed(2)} of $${budget.amount.toFixed(2)}).`;
      }

      // Ensure notification fires at most once per budget per threshold per month (FR-16)
      if (alertType) {
        const alreadyFired = dbStore.notifications.some((n) => n.userId === userId && n.type === alertType);
        if (!alreadyFired) {
          dbStore.notifications.push({
            id: `notif_${Date.now()}`,
            userId,
            type: alertType,
            message: msg,
            isRead: false,
            createdAt: new Date(),
          });
        }
      }
    });
  }
}
