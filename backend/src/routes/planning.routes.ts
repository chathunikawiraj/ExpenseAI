import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  addContribution,
  addGoal,
  editGoal,
  listPlanningBudgets,
  listPlanningGoals,
  removeBudget,
  removeGoal,
  saveBudget,
} from '../controllers/planning.controller';

const router = Router();
router.use(authenticate);

router.get('/budgets', listPlanningBudgets);
router.post('/budgets', saveBudget);
router.delete('/budgets/:id', removeBudget);

router.get('/goals', listPlanningGoals);
router.post('/goals', addGoal);
router.put('/goals/:id', editGoal);
router.patch('/goals/:id', editGoal);
router.post('/goals/:id/contributions', addContribution);
router.delete('/goals/:id', removeGoal);

export default router;
