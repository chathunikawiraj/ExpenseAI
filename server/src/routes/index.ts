import { Router } from 'express';
import authRoutes from './auth.routes';
import transactionRoutes from './transaction.routes';
import budgetRoutes from './budget.routes';
import analyticsRoutes from './analytics.routes';
import receiptRoutes from './receipt.routes';
import insightRoutes from './insight.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/', transactionRoutes);
router.use('/', budgetRoutes);
router.use('/', analyticsRoutes);
router.use('/', receiptRoutes);
router.use('/', insightRoutes);
router.use('/', adminRoutes);

export default router;
