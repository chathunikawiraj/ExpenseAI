import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getNotifications,
  readAllNotifications,
  readNotification,
  removeNotification,
} from '../controllers/notifications.controller';

const router = Router();
router.use(authenticate);
router.get('/', getNotifications);
router.patch('/read-all', readAllNotifications);
router.patch('/:id/read', readNotification);
router.delete('/:id', removeNotification);

export default router;
