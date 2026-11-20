import { Router } from 'express';
import {
  addIncome,
  editIncome,
  listIncomes,
  readIncome,
  removeIncome,
} from '../controllers/income.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import {
  createIncomeSchema,
  incomeIdSchema,
  updateIncomeSchema,
} from '../validators/income.validator';

const router = Router();

router.use(authenticate);

router.param('id', (req, res, next, id) => {
  if (!incomeIdSchema.safeParse(id).success) {
    res.status(400).json({ error: 'Income ID must be a valid UUID.' });
    return;
  }
  next();
});

router.get('/', listIncomes);
router.post('/', validateBody(createIncomeSchema), addIncome);
router.get('/:id', readIncome);
router.patch('/:id', validateBody(updateIncomeSchema), editIncome);
router.delete('/:id', removeIncome);

export default router;
