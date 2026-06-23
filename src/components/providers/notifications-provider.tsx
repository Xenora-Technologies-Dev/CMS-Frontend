'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { useSocket, useSocketEvent } from '@/components/providers/socket-provider';
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

function showBrowserNotification(notification: Notification): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const instance = new Notification(notification.title, {
      body: notification.body,
      tag: notification.id,
    });
    instance.onclick = () => {
      window.focus();
      instance.close();
    };
  } catch {
    // Browser may block notifications in some contexts
  }
}

interface NotificationsContextValue {
  notifications: Notification[];
  unreadTotal: number;
  hasNewAlert: boolean;
  loading: boolean;
  refresh: (options?: { background?: boolean }) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearNewAlert: () => void;
  onRealtimeNotification: (handler: (notification: Notification) => void) => () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { connected } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [hasNewAlert, setHasNewAlert] = useState(false);
  const [loading, setLoading] = useState(false);

  const hasLoadedOnceRef = useRef(false);
  const realtimeHandlersRef = useRef(new Set<(notification: Notification) => void>());

  const refresh = useCallback(async (options?: { background?: boolean }) => {
    if (!user) {
      setNotifications([]);
      setUnreadTotal(0);
      setHasNewAlert(false);
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

  useEffect(() => {
    if (connected && hasLoadedOnceRef.current) {
      void refresh({ background: true });
    }
  }, [connected, refresh]);

  useSocketEvent<Notification>(SocketEvents.NOTIFICATION, (notification) => {
    playNotificationSound();
    showBrowserNotification(notification);

    setNotifications((prev) => {
      const without = prev.filter((n) => n.id !== notification.id);
      return [notification, ...without].slice(0, 5);
    });

    if (!notification.readAt) {
      setUnreadTotal((count) => count + 1);
      setHasNewAlert(true);
    }

    for (const handler of realtimeHandlersRef.current) {
      handler(notification);
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
    setHasNewAlert(false);
  }, []);

  const clearNewAlert = useCallback(() => {
    setHasNewAlert(false);
  }, []);

  const onRealtimeNotification = useCallback((handler: (notification: Notification) => void) => {
    realtimeHandlersRef.current.add(handler);
    return () => {
      realtimeHandlersRef.current.delete(handler);
    };
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadTotal,
      hasNewAlert,
      loading,
      refresh,
      markRead,
      markAllRead,
      clearNewAlert,
      onRealtimeNotification,
    }),
    [
      notifications,
      unreadTotal,
      hasNewAlert,
      loading,
      refresh,
      markRead,
      markAllRead,
      clearNewAlert,
      onRealtimeNotification,
    ],
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
