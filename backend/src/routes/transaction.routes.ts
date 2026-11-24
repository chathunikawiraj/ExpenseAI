import { Router } from 'express';
import { listTransactions } from '../controllers/transaction.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', listTransactions);

export default router;
