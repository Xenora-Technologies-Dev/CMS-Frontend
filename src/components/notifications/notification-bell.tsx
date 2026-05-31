'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSocketEvent } from '@/components/providers/socket-provider';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from '@/lib/notification-api';
import { playNotificationSound, primeNotificationSound } from '@/lib/notification-sound';
import {
  requestNotificationPermission,
  useNotificationAttention,
} from '@/hooks/use-notification-attention';
import { SocketEvents } from '@/lib/socket-events';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  notificationsHref: string;
}

export function NotificationBell({ notificationsHref }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [hasNewAlert, setHasNewAlert] = useState(false);

  const { showBrowserNotification } = useNotificationAttention(unreadTotal, hasNewAlert);

  const load = useCallback(async () => {
    try {
      const [recent, unreadResult] = await Promise.all([
        listNotifications({ limit: 8 }),
        listNotifications({ limit: 1, unreadOnly: true }),
      ]);
      setNotifications(recent.data);
      setUnreadTotal(unreadResult.meta.total);
      if (unreadResult.meta.total === 0) {
        setHasNewAlert(false);
      }
    } catch {
      // Silently ignore — bell still renders
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useSocketEvent<Notification>(SocketEvents.NOTIFICATION, (notification) => {
    playNotificationSound();
    setHasNewAlert(true);
    showBrowserNotification(notification);
    setNotifications((prev) => {
      const without = prev.filter((n) => n.id !== notification.id);
      return [notification, ...without].slice(0, 8);
    });
    if (!notification.readAt) {
      setUnreadTotal((count) => count + 1);
    }
  });

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    setUnreadTotal((count) => Math.max(0, count - 1));
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
    );
    setUnreadTotal(0);
    setHasNewAlert(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      requestNotificationPermission();
      primeNotificationSound();
      setHasNewAlert(false);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative',
            hasNewAlert && unreadTotal > 0 && 'animate-pulse ring-2 ring-primary ring-offset-2 ring-offset-background',
          )}
          aria-label={
            unreadTotal > 0 ? `Notifications, ${unreadTotal} unread` : 'Notifications'
          }
          onClick={primeNotificationSound}
        >
          <Bell className={cn('h-5 w-5', hasNewAlert && unreadTotal > 0 && 'text-primary')} />
          {unreadTotal > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground shadow-sm">
              {unreadTotal > 99 ? '99+' : unreadTotal}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[min(calc(100vw-2rem),20rem)] sm:w-80"
        align="end"
        forceMount
      >
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Notifications</span>
          {unreadTotal > 0 && (
            <button
              type="button"
              className="text-xs font-normal text-primary hover:underline"
              onClick={() => void handleMarkAllRead()}
            >
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">No notifications</p>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={cn(
                'cursor-pointer flex-col items-start gap-0.5 py-2',
                !n.readAt && 'bg-primary/5',
              )}
              onClick={() => {
                if (!n.readAt) void handleMarkRead(n.id);
              }}
            >
              <span className={cn('text-sm font-medium', n.readAt && 'text-muted-foreground')}>
                {!n.readAt && (
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-primary align-middle" />
                )}
                {n.title}
              </span>
              <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(n.createdAt).toLocaleString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })}
              </span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href={notificationsHref}
            className="w-full cursor-pointer justify-center text-center"
            onClick={() => setHasNewAlert(false)}
          >
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
