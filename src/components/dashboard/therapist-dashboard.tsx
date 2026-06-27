'use client';

import { BookingsNeedsAttentionPanel } from '@/components/booking/bookings-needs-attention-panel';
import { fetchTherapistDashboardData } from '@/lib/therapist-dashboard-api';
import type { Booking } from '@/lib/types';
import type { LeaveRequest } from '@/lib/leave-api';
import { TodaySchedule } from '@/components/dashboard/today-schedule';
import { OlderAppointments } from '@/components/dashboard/older-appointments';
import { UpcomingAppointments } from '@/components/dashboard/upcoming-appointments';
import { LeaveStatusBadge } from '@/components/leave/leave-status-badge';
import { formatDateTime } from '@/lib/utils';
import { useAuth } from '@/components/auth/auth-provider';
import { useNotifications } from '@/components/providers/notifications-provider';
import { useSocketEvent } from '@/components/providers/socket-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SocketEvents } from '@/lib/socket-events';
import { Bell, CalendarDays, Palmtree, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useBackgroundLoadState } from '@/hooks/use-background-load-state';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { useCallback, useEffect, useState } from 'react';

export function TherapistDashboard() {
  const { user } = useAuth();
  const therapistId = user?.therapistId;
  const { notifications, markRead } = useNotifications();

  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [older, setOlder] = useState<Booking[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const { initialLoading, refreshing, beginLoad, endLoad } = useBackgroundLoadState();
  const [errors, setErrors] = useState<string[]>([]);

  const load = useCallback(async (options?: { background?: boolean }) => {
    if (!therapistId) {
      endLoad();
      return;
    }

    beginLoad(options);
    setErrors([]);

    try {
      const data = await fetchTherapistDashboardData(therapistId);
      setTodayBookings(data.todayBookings);
      setUpcoming(data.upcoming);
      setOlder(data.older);
      setLeaves(data.leaves);
    } catch {
      setErrors(['Could not load dashboard data']);
    } finally {
      endLoad();
    }
  }, [therapistId, beginLoad, endLoad]);

  const debouncedBackgroundReload = useDebouncedCallback(() => {
    if (therapistId) void load({ background: true });
  }, 600);

  useEffect(() => {
    void load();
  }, [load]);

  useSocketEvent(SocketEvents.BOOKING_UPDATED, debouncedBackgroundReload);

  useSocketEvent(SocketEvents.SCHEDULE_UPDATED, debouncedBackgroundReload);

  useSocketEvent<LeaveRequest>(SocketEvents.LEAVE_UPDATED, (leave) => {
    if (leave.therapistId !== therapistId) return;
    setLeaves((prev) => {
      const without = prev.filter((l) => l.id !== leave.id);
      return [leave, ...without].slice(0, 5);
    });
  });

  const activeLeave = leaves.find((l) => l.status === 'APPROVED');
  const pendingLeave = leaves.find((l) => l.status === 'PENDING');

  if (!therapistId && !initialLoading) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Your account is not linked to a therapist profile. Contact your administrator to complete
        setup before using the dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your schedule and updates for today</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load({ background: true })}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" asChild>
            <Link href="/therapist/calendar">
              <CalendarDays className="mr-2 h-4 w-4" />
              My Calendar
            </Link>
          </Button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {errors.join(' · ')}
        </div>
      )}

      <BookingsNeedsAttentionPanel compact />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <TodaySchedule bookings={todayBookings} calendarHref="/therapist/calendar" />
          <UpcomingAppointments
            bookings={upcoming}
            title="Upcoming Patients"
            viewerRole="therapist"
          />
          <OlderAppointments bookings={older} viewerRole="therapist" />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Palmtree className="h-4 w-4 text-amber-600" />
                Leave Status
              </CardTitle>
              <Link
                href="/therapist/leaves/management"
                className="text-xs font-medium text-primary hover:underline"
              >
                Manage
              </Link>
            </CardHeader>
            <CardContent>
              {activeLeave ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex items-center gap-2">
                    <LeaveStatusBadge status="APPROVED" />
                    <span className="text-sm font-medium text-emerald-900">On approved leave</span>
                  </div>
                  <p className="mt-2 text-sm text-emerald-800">
                    {formatDateTime(activeLeave.startDateTime)} –{' '}
                    {formatDateTime(activeLeave.endDateTime)}
                  </p>
                </div>
              ) : pendingLeave ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-center gap-2">
                    <LeaveStatusBadge status="PENDING" />
                    <span className="text-sm font-medium text-amber-900">Pending approval</span>
                  </div>
                  <p className="mt-2 text-sm text-amber-800">{pendingLeave.reason}</p>
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">No active leave</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Bell className="h-4 w-4 text-blue-600" />
                Notifications
              </CardTitle>
              <Link
                href="/therapist/notifications"
                className="text-xs font-medium text-primary hover:underline"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No notifications</p>
              ) : (
                <div className="space-y-2">
                  {notifications.slice(0, 5).map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => !n.readAt && void markRead(n.id)}
                      className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                        n.readAt ? 'bg-slate-50 opacity-70' : 'border-blue-100 bg-blue-50/50'
                      }`}
                    >
                      <p className="font-medium text-slate-900">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {formatDateTime(n.createdAt)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
