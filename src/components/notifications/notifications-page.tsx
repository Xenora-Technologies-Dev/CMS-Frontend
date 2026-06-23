'use client';

import { useNotifications } from '@/components/providers/notifications-provider';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PaginatedMeta } from '@/lib/types';
import { listNotifications, type Notification } from '@/lib/notification-api';
import { useNotificationAttention } from '@/hooks/use-notification-attention';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function NotificationsPage() {
  const { unreadTotal, markRead, markAllRead, clearNewAlert, onRealtimeNotification } =
    useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginatedMeta>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useNotificationAttention(unreadTotal, unreadTotal > 0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listNotifications({ page, limit: 20 });
      setNotifications(result.data);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    clearNewAlert();
  }, [clearNewAlert]);

  useEffect(() => {
    return onRealtimeNotification((notification) => {
      if (page !== 1) return;
      setNotifications((prev) => {
        const without = prev.filter((n) => n.id !== notification.id);
        return [notification, ...without].slice(0, meta.limit);
      });
    });
  }, [onRealtimeNotification, page, meta.limit]);

  async function handleMarkRead(id: string) {
    await markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
  }

  async function handleMarkAllRead() {
    await markAllRead();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Bell className="h-6 w-6 text-primary" />
            Notifications
            {unreadTotal > 0 && (
              <span className="rounded-full bg-destructive px-2.5 py-0.5 text-sm font-semibold text-destructive-foreground">
                {unreadTotal} unread
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            Appointment updates, leave requests, and system messages — updated in real time
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
          {unreadTotal > 0 && (
            <Button variant="secondary" size="sm" onClick={() => void handleMarkAllRead()}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No notifications yet</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => !n.readAt && void handleMarkRead(n.id)}
                  className={cn(
                    'w-full rounded-lg border p-4 text-left transition-colors',
                    n.readAt
                      ? 'bg-slate-50 opacity-75'
                      : 'border-primary/20 bg-primary/5 ring-1 ring-primary/10',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {!n.readAt && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                    )}
                    <p className="font-medium text-slate-900">{n.title}</p>
                    {!n.readAt && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        New
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </p>
                </button>
              ))}
            </div>
          )}
          <PaginationControls meta={meta} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  );
}
