import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { generateInsights, getInsights } from '../controllers/insights.controller';

const router = Router();
router.use(authenticate);
router.get('/', getInsights);
router.post('/generate', generateInsights);

export default router;
