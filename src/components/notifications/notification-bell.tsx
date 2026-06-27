'use client';

import { useNotifications } from '@/components/providers/notifications-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  requestNotificationPermission,
  useNotificationAttention,
} from '@/hooks/use-notification-attention';
import { primeNotificationSound } from '@/lib/notification-sound';
import { cn, formatDateTime } from '@/lib/utils';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface NotificationBellProps {
  notificationsHref: string;
}

export function NotificationBell({ notificationsHref }: NotificationBellProps) {
  const { notifications, unreadTotal, hasNewAlert, markRead, markAllRead, clearNewAlert } =
    useNotifications();
  const [open, setOpen] = useState(false);

  useNotificationAttention(unreadTotal, hasNewAlert);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      requestNotificationPermission();
      primeNotificationSound();
      clearNewAlert();
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
            hasNewAlert &&
              unreadTotal > 0 &&
              'animate-pulse ring-2 ring-primary ring-offset-2 ring-offset-background',
          )}
          aria-label={unreadTotal > 0 ? `Notifications, ${unreadTotal} unread` : 'Notifications'}
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
              onClick={() => void markAllRead()}
            >
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">No notifications</p>
        ) : (
          notifications.slice(0, 5).map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={cn(
                'cursor-pointer flex-col items-start gap-0.5 py-2',
                !n.readAt && 'bg-primary/5',
              )}
              onClick={() => {
                if (!n.readAt) void markRead(n.id);
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
                {formatDateTime(n.createdAt)}
              </span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href={notificationsHref}
            className="w-full cursor-pointer justify-center text-center"
            onClick={() => clearNewAlert()}
          >
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
