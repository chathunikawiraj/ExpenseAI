import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { dbStore, DBSavingsGoal } from '../data/store';

export class BudgetController {
  // GET /budgets (FR-14, FR-15)
  static async getBudgets(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { month = new Date().toISOString().substring(0, 7) } = req.query;

    const budgets = dbStore.budgets.filter((b) => b.userId === userId && b.month === month);

    // Calculate actual expenses for this month to compute spent, remaining, percentage (FR-15)
    const monthExpenses = dbStore.expenses.filter((e) => {
      const eMonth = e.date.toISOString().substring(0, 7);
      return e.userId === userId && eMonth === month;
    });

    const enriched = budgets.map((b) => {
      let spent = 0;
      if (b.categoryId === null) {
        // Overall budget = sum of all expenses in month
        spent = monthExpenses.reduce((sum, curr) => sum + curr.amount, 0);
      } else {
        // Category budget = sum of matching category expenses
        spent = monthExpenses
          .filter((e) => e.categoryId === b.categoryId)
          .reduce((sum, curr) => sum + curr.amount, 0);
      }

      const category = b.categoryId ? dbStore.categories.find((c) => c.id === b.categoryId) : null;
      const percentage = b.amount > 0 ? Math.min(Math.round((spent / b.amount) * 100), 100) : 0;
      const remaining = Math.max(0, b.amount - spent);

      return {
        ...b,
        category: category ? { id: category.id, name: category.name, color: category.color, icon: category.icon } : null,
        spent: parseFloat(spent.toFixed(2)),
        remaining: parseFloat(remaining.toFixed(2)),
        percentage,
      };
    });

    res.status(200).json(enriched);
  }

  // POST /budgets (FR-14)
  static async createOrUpdateBudget(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { categoryId, month, amount } = req.body;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      res.status(400).json({ error: 'Budget amount must be greater than 0 (FR-14).' });
      return;
    }

    const targetMonth = month || new Date().toISOString().substring(0, 7);
    const catId = categoryId === 'overall' || !categoryId ? null : categoryId;

    // Only one budget per user, month, and category (FR-14)
    let existing = dbStore.budgets.find(
      (b) => b.userId === userId && b.month === targetMonth && b.categoryId === catId
    );

    if (existing) {
      existing.amount = amountNum;
    } else {
      existing = {
        id: `bud_${Date.now()}`,
        userId,
        categoryId: catId,
        month: targetMonth,
        amount: amountNum,
        createdAt: new Date(),
      };
      dbStore.budgets.push(existing);
    }

    res.status(201).json(existing);
  }

  // DELETE /budgets/:id (FR-14)
  static async deleteBudget(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id } = req.params;
    const index = dbStore.budgets.findIndex((b) => b.id === id && b.userId === userId);

    if (index === -1) {
      res.status(404).json({ error: 'Budget record not found.' });
      return;
    }

    dbStore.budgets.splice(index, 1);
    res.status(200).json({ message: 'Budget deleted.' });
  }

  // GET /goals (FR-17)
  static async getGoals(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const goals = dbStore.savingsGoals.filter((g) => g.userId === userId);
    res.status(200).json(goals);
  }

  // POST /goals (FR-17)
  static async createGoal(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { name, targetAmount, savedAmount = 0, targetDate, color } = req.body;

    const targetNum = parseFloat(targetAmount);
    if (isNaN(targetNum) || targetNum <= 0) {
      res.status(400).json({ error: 'Target amount must be a positive number.' });
      return;
    }

    const newGoal: DBSavingsGoal = {
      id: `goal_${Date.now()}`,
      userId,
      name: name.trim(),
      targetAmount: targetNum,
      savedAmount: parseFloat(savedAmount) || 0,
      targetDate: new Date(targetDate),
      color: color || '#6C5CE7',
      createdAt: new Date(),
    };

    dbStore.savingsGoals.push(newGoal);
    res.status(201).json(newGoal);
  }

  // PUT /goals/:id (FR-17)
  static async updateGoal(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id } = req.params;
    const goal = dbStore.savingsGoals.find((g) => g.id === id && g.userId === userId);

    if (!goal) {
      res.status(404).json({ error: 'Savings goal not found.' });
      return;
    }

    const { name, targetAmount, savedAmount, targetDate, color } = req.body;
    if (name) goal.name = name.trim();
    if (targetAmount) goal.targetAmount = parseFloat(targetAmount);
    if (savedAmount !== undefined) goal.savedAmount = parseFloat(savedAmount);
    if (targetDate) goal.targetDate = new Date(targetDate);
    if (color) goal.color = color;

    res.status(200).json(goal);
  }

  // DELETE /goals/:id (FR-17)
  static async deleteGoal(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id } = req.params;
    const index = dbStore.savingsGoals.findIndex((g) => g.id === id && g.userId === userId);

    if (index === -1) {
      res.status(404).json({ error: 'Goal not found.' });
      return;
    }

    dbStore.savingsGoals.splice(index, 1);
    res.status(200).json({ message: 'Savings goal deleted.' });
  }

  // GET /notifications
  static async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const notifs = dbStore.notifications.filter((n) => n.userId === userId);
    notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.status(200).json(notifs);
  }

  // PATCH /notifications/:id/read
  static async markNotificationRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id } = req.params;
    const notif = dbStore.notifications.find((n) => n.id === id && n.userId === userId);
    if (notif) notif.isRead = true;
    res.status(200).json({ success: true });
  }
}
