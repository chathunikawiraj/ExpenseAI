import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { mockNotifications } from '../data/mockData';
import { NotificationItem } from '../types';

interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(mockNotifications);

  const value = useMemo(() => {
    const markAsRead = (id: string) => {
      setNotifications((items) =>
        items.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
      );
    };
    const markAllAsRead = () => {
      setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
    };

    return {
      notifications,
      unreadCount: notifications.filter((item) => !item.isRead).length,
      markAsRead,
      markAllAsRead,
    };
  }, [notifications]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
