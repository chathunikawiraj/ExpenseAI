import prisma from '../config/database';
import { AuthError } from './auth.service';

export const listNotifications = (userId: string) =>
  prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

export const markNotificationRead = async (userId: string, notificationId: string) => {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
  if (result.count === 0) throw new AuthError('Notification was not found.', 404, 'NOTIFICATION_NOT_FOUND');
};

export const markAllNotificationsRead = async (userId: string) =>
  prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

export const deleteNotification = async (userId: string, notificationId: string) => {
  const result = await prisma.notification.deleteMany({ where: { id: notificationId, userId } });
  if (result.count === 0) throw new AuthError('Notification was not found.', 404, 'NOTIFICATION_NOT_FOUND');
};
