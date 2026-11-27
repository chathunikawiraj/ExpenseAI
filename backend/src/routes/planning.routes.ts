import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  addContribution,
  addGoal,
  editBudget,
  editGoal,
  listPlanningBudgets,
  listPlanningGoalContributions,
  listPlanningGoals,
  readBudget,
  readPlanningGoal,
  removeBudget,
  removeGoal,
  saveBudget,
} from '../controllers/planning.controller';

const router = Router();
router.use(authenticate);

router.get('/budgets', listPlanningBudgets);
router.post('/budgets', saveBudget);
router.get('/budgets/:id', readBudget);
router.put('/budgets/:id', editBudget);
router.delete('/budgets/:id', removeBudget);

router.get('/goals', listPlanningGoals);
router.post('/goals', addGoal);
router.get('/goals/:id', readPlanningGoal);
router.put('/goals/:id', editGoal);
router.patch('/goals/:id', editGoal);
router.get('/goals/:id/contributions', listPlanningGoalContributions);
router.post('/goals/:id/contributions', addContribution);
router.delete('/goals/:id', removeGoal);

export default router;
