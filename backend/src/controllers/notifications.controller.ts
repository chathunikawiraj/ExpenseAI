import type { RequestHandler } from 'express';
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notifications.service';

export const getNotifications: RequestHandler = async (req, res) => {
  res.status(200).json(await listNotifications(req.authUser!.userId));
};

export const readNotification: RequestHandler = async (req, res) => {
  await markNotificationRead(req.authUser!.userId, req.params.id as string);
  res.status(200).json({ message: 'Notification marked as read.' });
};

export const readAllNotifications: RequestHandler = async (req, res) => {
  const result = await markAllNotificationsRead(req.authUser!.userId);
  res.status(200).json({ message: 'Notifications marked as read.', count: result.count });
};

export const removeNotification: RequestHandler = async (req, res) => {
  await deleteNotification(req.authUser!.userId, req.params.id as string);
  res.status(200).json({ message: 'Notification deleted.' });
};
