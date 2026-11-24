
import { Router } from 'express';

import {
  listCategories,
  addCategory,
  editCategory,
  removeCategory,
} from '../controllers/category.controller';

import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { createCategorySchema } from '../validators/category.validator';

const router = Router();

router.use(authenticate);

router.get('/', listCategories);

router.post(
  '/',
  validateBody(createCategorySchema),
  addCategory
);

router.patch(
  '/:id',
  validateBody(createCategorySchema),
  editCategory
);

router.delete('/:id', removeCategory);

export default router;
