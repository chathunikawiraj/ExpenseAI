import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { mockNotifications } from '../data/mockData';
import { NotificationItem } from '../types';
import { getAccessToken } from '../services/api';
import { budgetsApi } from '../services/apiService';

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
  const [notifications, setNotifications] = useState<NotificationItem[]>(mockNotifications);
  const [isLoading, setIsLoading] = useState(Boolean(getAccessToken()));
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!getAccessToken()) {
      setIsLoading(false);
      return;
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
  }, [reloadKey]);

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
    const unreadItems = notifications.filter((item) => !item.isRead);
    try {
      if (getAccessToken()) {
        await Promise.all(unreadItems.map((item) => budgetsApi.markNotificationRead(item.id)));
      }
      setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the notifications.');
    }
  }, [notifications]);
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
