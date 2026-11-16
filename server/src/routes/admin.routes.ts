import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';

const router = Router();

// Admin protection (FR-34: regular users receive 403)
router.use(authenticate, requireAdmin);

router.get('/admin/stats', AdminController.getStats);
router.get('/admin/users', AdminController.getUsers);
router.patch('/admin/users/:id/status', AdminController.updateUserStatus);
router.delete('/admin/users/:id', AdminController.deleteUser);
router.get('/admin/categories', AdminController.getDefaultCategories);
router.post('/admin/categories', AdminController.createDefaultCategory);
router.delete('/admin/categories/:id', AdminController.deleteDefaultCategory);

export default router;
