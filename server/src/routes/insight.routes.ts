import { Router } from 'express';
import { InsightController } from '../controllers/insight.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/insights', authenticate, InsightController.getInsights);
router.post('/insights/generate', authenticate, InsightController.generate);

export default router;
