import React, { useState } from 'react';
import { AlertTriangle, Bell, Check, CheckCheck, ReceiptText } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { useNotifications } from '../context/NotificationContext';

type NotificationFilter = 'all' | 'unread';

const notificationDetails: Record<string, { title: string; icon: typeof Bell; color: string }> = {
  BUDGET_80: { title: 'Budget alert', icon: AlertTriangle, color: 'text-amber-500' },
  OCR_PROCESSED: { title: 'Receipt processed', icon: ReceiptText, color: 'text-emerald-500' },
  SYSTEM: { title: 'Account update', icon: Bell, color: 'text-primary' },
};

export const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const visibleNotifications =
    filter === 'unread' ? notifications.filter((item) => !item.isRead) : notifications;

  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-xs text-navy-muted">
            {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
          </p>
        </div>
        <button
          type="button"
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className="inline-flex items-center gap-2 self-start rounded-full border border-purple-100 bg-white px-4 py-2.5 text-xs font-bold text-primary shadow-sm transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
        >
          <CheckCheck className="h-4 w-4" />
          Mark all as read
        </button>
      </div>

      <div className="flex w-fit items-center gap-1 rounded-full border border-gray-100 bg-white p-1 shadow-sm">
        {(['all', 'unread'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            aria-pressed={filter === option}
            className={`rounded-full px-4 py-2 text-xs font-bold capitalize transition-colors ${
              filter === option ? 'bg-primary text-white shadow-comet-glow' : 'text-navy-muted hover:text-navy'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border border-purple-100/70 bg-white shadow-comet">
        {visibleNotifications.length ? (
          <ul className="divide-y divide-gray-100">
            {visibleNotifications.map((notification) => {
              const details = notificationDetails[notification.type] || notificationDetails.SYSTEM;
              const Icon = details.icon;

              return (
                <li
                  key={notification.id}
                  className={`flex items-start gap-4 p-5 transition-colors hover:bg-primary-light/40 ${
                    notification.isRead ? 'opacity-75' : ''
                  }`}
                >
                  <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-light ${details.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-bold text-navy">{details.title}</h2>
                      {!notification.isRead && (
                        <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unread" />
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-navy-muted">{notification.message}</p>
                    <time className="mt-2 block text-[11px] text-navy-muted/70" dateTime={notification.createdAt}>
                      {new Date(notification.createdAt).toLocaleString()}
                    </time>
                  </div>
                  {!notification.isRead && (
                    <button
                      type="button"
                      onClick={() => markAsRead(notification.id)}
                      aria-label={`Mark ${details.title.toLowerCase()} as read`}
                      className="flex-shrink-0 rounded-full p-2 text-navy-muted transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="p-10 text-center">
            <Bell className="mx-auto h-8 w-8 text-navy-muted/50" />
            <p className="mt-3 text-sm font-bold text-navy">You're all caught up</p>
            <p className="mt-1 text-xs text-navy-muted">There are no unread notifications.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
};
