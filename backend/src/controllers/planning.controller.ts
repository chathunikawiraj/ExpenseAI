import type { RequestHandler } from 'express';
import {
  contributeToGoal,
  createGoal,
  deleteBudget,
  deleteGoal,
  getBudget,
  getGoal,
  listBudgets,
  listGoalContributions,
  listGoals,
  updateBudget,
  updateGoal,
  upsertBudget,
} from '../services/planning.service';
import {
  upsertBudgetSchema,
  updateBudgetSchema,
  budgetQuerySchema,
  budgetIdSchema,
} from '../validators/budget.validator';
import {
  contributionSchema,
  contributionQuerySchema,
  createGoalSchema,
  goalIdSchema,
  updateGoalSchema,
} from '../validators/goal.validator';

export const listPlanningBudgets: RequestHandler = async (req, res) => {
  const parsed = budgetQuerySchema.safeParse(req.query);
  if (!parsed.success) return void res.status(400).json({ error: 'Validation failed.', details: parsed.error.issues });
  res.status(200).json(await listBudgets(req.authUser!.userId, parsed.data.month));
};

export const saveBudget: RequestHandler = async (req, res) => {
  const parsed = upsertBudgetSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: 'Validation failed.', details: parsed.error.issues });
  const budget = await upsertBudget(req.authUser!.userId, parsed.data);
  res.status(200).json(budget);
};

export const readBudget: RequestHandler = async (req, res) => {
  if (!budgetIdSchema.safeParse(req.params.id).success) {
    res.status(400).json({ error: 'Budget ID must be a valid UUID.' });
    return;
  }
  res.status(200).json(await getBudget(req.authUser!.userId, req.params.id as string));
};

export const editBudget: RequestHandler = async (req, res) => {
  if (!budgetIdSchema.safeParse(req.params.id).success) {
    res.status(400).json({ error: 'Budget ID must be a valid UUID.' });
    return;
  }
  const parsed = updateBudgetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed.', details: parsed.error.issues });
    return;
  }
  res.status(200).json(await updateBudget(req.authUser!.userId, req.params.id as string, parsed.data));
};

export const removeBudget: RequestHandler = async (req, res) => {
  if (!budgetIdSchema.safeParse(req.params.id).success) {
    res.status(400).json({ error: 'Budget ID must be a valid UUID.' });
    return;
  }
  await deleteBudget(req.authUser!.userId, req.params.id as string);
  res.status(200).json({ message: 'Budget deleted successfully.' });
};

export const listPlanningGoals: RequestHandler = async (req, res) => {
  res.status(200).json(await listGoals(req.authUser!.userId));
};

export const readPlanningGoal: RequestHandler = async (req, res) => {
  if (!goalIdSchema.safeParse(req.params.id).success) {
    res.status(400).json({ error: 'Goal ID must be a valid UUID.' });
    return;
  }
  res.status(200).json(await getGoal(req.authUser!.userId, req.params.id as string));
};

export const listPlanningGoalContributions: RequestHandler = async (req, res) => {
  if (!goalIdSchema.safeParse(req.params.id).success) {
    res.status(400).json({ error: 'Goal ID must be a valid UUID.' });
    return;
  }
  const parsed = contributionQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed.', details: parsed.error.issues });
    return;
  }
  res.status(200).json(
    await listGoalContributions(req.authUser!.userId, req.params.id as string, parsed.data)
  );
};

export const addGoal: RequestHandler = async (req, res) => {
  const parsed = createGoalSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: 'Validation failed.', details: parsed.error.issues });
  const goal = await createGoal(req.authUser!.userId, parsed.data);
  res.status(201).json(goal);
};

export const editGoal: RequestHandler = async (req, res) => {
  if (!goalIdSchema.safeParse(req.params.id).success) {
    res.status(400).json({ error: 'Goal ID must be a valid UUID.' });
    return;
  }
  const parsed = updateGoalSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: 'Validation failed.', details: parsed.error.issues });
  const goal = await updateGoal(req.authUser!.userId, req.params.id as string, parsed.data);
  res.status(200).json(goal);
};

export const removeGoal: RequestHandler = async (req, res) => {
  if (!goalIdSchema.safeParse(req.params.id).success) {
    res.status(400).json({ error: 'Goal ID must be a valid UUID.' });
    return;
  }
  await deleteGoal(req.authUser!.userId, req.params.id as string);
  res.status(200).json({ message: 'Savings goal deleted successfully.' });
};

export const addContribution: RequestHandler = async (req, res) => {
  if (!goalIdSchema.safeParse(req.params.id).success) {
    res.status(400).json({ error: 'Goal ID must be a valid UUID.' });
    return;
  }
  const parsed = contributionSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: 'Validation failed.', details: parsed.error.issues });
  const goal = await contributeToGoal(req.authUser!.userId, req.params.id as string, parsed.data);
  res.status(200).json(goal);
};
