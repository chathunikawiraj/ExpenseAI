import { Router } from 'express';
import {
  addExpense,
  editExpense,
  listExpenses,
  readExpense,
  removeExpense,
} from '../controllers/expense.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import {
  createExpenseSchema,
  expenseIdSchema,
  updateExpenseSchema,
} from '../validators/expense.validator';

const router = Router();

router.use(authenticate);

router.param('id', (req, res, next, id) => {
  if (!expenseIdSchema.safeParse(id).success) {
    res.status(400).json({ error: 'Expense ID must be a valid UUID.' });
    return;
  }
  next();
});

router.get('/', listExpenses);
router.post('/', validateBody(createExpenseSchema), addExpense);
router.get('/:id', readExpense);
router.put('/:id', validateBody(updateExpenseSchema), editExpense);
router.patch('/:id', validateBody(updateExpenseSchema), editExpense);
router.delete('/:id', removeExpense);

export default router;
