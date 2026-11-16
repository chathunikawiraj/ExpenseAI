import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/analytics/summary', authenticate, AnalyticsController.getSummary);
router.get('/analytics/trends', authenticate, AnalyticsController.getTrends);
router.get('/reports/:month', authenticate, AnalyticsController.getMonthlyReport);
router.get('/export/csv', authenticate, AnalyticsController.exportCsv);

export default router;
