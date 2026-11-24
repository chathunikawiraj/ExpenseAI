import { Router } from 'express';
import {
  getCategoryBreakdownData,
  getSummary,
  getTrends,
} from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/summary', getSummary);
router.get('/category-breakdown', getCategoryBreakdownData);
router.get('/trends', getTrends);

export default router;
