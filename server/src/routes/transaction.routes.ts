import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Income routes (FR-08, FR-09)
router.get('/incomes', authenticate, TransactionController.getIncomes);
router.post('/incomes', authenticate, TransactionController.createIncome);
router.put('/incomes/:id', authenticate, TransactionController.updateIncome);
router.delete('/incomes/:id', authenticate, TransactionController.deleteIncome);

// Expense routes (FR-10, FR-11)
router.get('/expenses', authenticate, TransactionController.getExpenses);
router.post('/expenses', authenticate, TransactionController.createExpense);
router.put('/expenses/:id', authenticate, TransactionController.updateExpense);
router.delete('/expenses/:id', authenticate, TransactionController.deleteExpense);

// Category routes (FR-12)
router.get('/categories', authenticate, TransactionController.getCategories);
router.post('/categories', authenticate, TransactionController.createCategory);

export default router;
