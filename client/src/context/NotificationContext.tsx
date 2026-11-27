import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { NotificationItem } from '../types';
import { getAccessToken } from '../services/api';
import { budgetsApi } from '../services/apiService';
import { useAuth } from './AuthContext';

interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(getAccessToken()));
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const notificationOwnerId = useRef<string | null>(null);
  const userId = user?.id;

  useEffect(() => {
    if (isAuthLoading) {
      notificationOwnerId.current = null;
      setNotifications([]);
      setError(null);
      setIsLoading(Boolean(getAccessToken()));
      return;
    }

    if (!userId || !getAccessToken()) {
      notificationOwnerId.current = null;
      setNotifications([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (notificationOwnerId.current !== userId) {
      setNotifications([]);
      notificationOwnerId.current = userId;
    }

    let active = true;
    setIsLoading(true);
    setError(null);
    budgetsApi.getNotifications()
      .then((items) => {
        if (active) setNotifications(items);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'The server request failed.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isAuthLoading, reloadKey, userId]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      if (getAccessToken()) await budgetsApi.markNotificationRead(id);
      setNotifications((items) =>
        items.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the notification.');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      if (getAccessToken()) await budgetsApi.markAllNotificationsRead();
      setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the notifications.');
    }
  }, []);
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: notifications.filter((item) => !item.isRead).length,
      isLoading,
      error,
      reload,
      markAsRead,
      markAllAsRead,
    }),
    [notifications, isLoading, error, reload, markAsRead, markAllAsRead],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
