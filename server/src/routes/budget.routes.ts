import { Router } from 'express';
import { BudgetController } from '../controllers/budget.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Budgets (FR-14, FR-15, FR-16)
router.get('/budgets', authenticate, BudgetController.getBudgets);
router.post('/budgets', authenticate, BudgetController.createOrUpdateBudget);
router.delete('/budgets/:id', authenticate, BudgetController.deleteBudget);

// Savings Goals (FR-17)
router.get('/goals', authenticate, BudgetController.getGoals);
router.post('/goals', authenticate, BudgetController.createGoal);
router.put('/goals/:id', authenticate, BudgetController.updateGoal);
router.delete('/goals/:id', authenticate, BudgetController.deleteGoal);

// Notifications
router.get('/notifications', authenticate, BudgetController.getNotifications);
router.patch('/notifications/:id/read', authenticate, BudgetController.markNotificationRead);

export default router;
