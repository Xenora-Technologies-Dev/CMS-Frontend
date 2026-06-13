'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { useSocketEvent } from '@/components/providers/socket-provider';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from '@/lib/notification-api';
import { playNotificationSound } from '@/lib/notification-sound';
import { SocketEvents } from '@/lib/socket-events';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface NotificationsContextValue {
  notifications: Notification[];
  unreadTotal: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const hasLoadedOnceRef = useRef(false);

  const refresh = useCallback(async (options?: { background?: boolean }) => {
    if (!user) {
      setNotifications([]);
      setUnreadTotal(0);
      return;
    }

    const isBackground = Boolean(options?.background && hasLoadedOnceRef.current);
    if (!isBackground) {
      setLoading(true);
    }
    try {
      const [recent, unreadResult] = await Promise.all([
        listNotifications({ limit: 5 }),
        listNotifications({ limit: 1, unreadOnly: true }),
      ]);
      setNotifications(recent.data);
      setUnreadTotal(unreadResult.meta.total);
      hasLoadedOnceRef.current = true;
    } catch {
      // Bell and dashboard degrade gracefully
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useSocketEvent<Notification>(SocketEvents.NOTIFICATION, (notification) => {
    playNotificationSound();
    setNotifications((prev) => {
      const without = prev.filter((n) => n.id !== notification.id);
      return [notification, ...without].slice(0, 5);
    });
    if (!notification.readAt) {
      setUnreadTotal((count) => count + 1);
    }
  });

  const markRead = useCallback(async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    setUnreadTotal((count) => Math.max(0, count - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
    );
    setUnreadTotal(0);
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadTotal,
      loading,
      refresh,
      markRead,
      markAllRead,
    }),
    [notifications, unreadTotal, loading, refresh, markRead, markAllRead],
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
}

export function useNotificationsOptional() {
  return useContext(NotificationsContext);
}
