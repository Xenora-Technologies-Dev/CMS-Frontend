'use client';

import { fetchDoctorDashboardData } from '@/lib/doctor-dashboard-api';
import type { Booking } from '@/lib/types';
import { OlderAppointments } from '@/components/dashboard/older-appointments';
import { TodaySchedule } from '@/components/dashboard/today-schedule';
import { UpcomingAppointments } from '@/components/dashboard/upcoming-appointments';
import { useAuth } from '@/components/auth/auth-provider';
import { useSocketEvent } from '@/components/providers/socket-provider';
import { Button } from '@/components/ui/button';
import { useBackgroundLoadState } from '@/hooks/use-background-load-state';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { SocketEvents } from '@/lib/socket-events';
import { CalendarDays, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

export function DoctorDashboard() {
  const { user } = useAuth();
  const doctorId = user?.doctorId;

  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [older, setOlder] = useState<Booking[]>([]);
  const { initialLoading, refreshing, beginLoad, endLoad } = useBackgroundLoadState();
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (options?: { background?: boolean }) => {
    if (!doctorId) {
      endLoad();
      return;
    }

    beginLoad(options);
    setError(null);
    try {
      const data = await fetchDoctorDashboardData(doctorId);
      setTodayBookings(data.todayBookings);
      setUpcoming(data.upcoming);
      setOlder(data.older);
    } catch {
      setError('Could not load dashboard data');
    } finally {
      endLoad();
    }
  }, [doctorId, beginLoad, endLoad]);

  const debouncedBackgroundReload = useDebouncedCallback(() => {
    if (doctorId) void load({ background: true });
  }, 600);

  useEffect(() => {
    void load();
  }, [load]);

  useSocketEvent(SocketEvents.BOOKING_UPDATED, debouncedBackgroundReload);

  if (!doctorId && !initialLoading) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Your account is not linked to a doctor profile. Contact your administrator to complete
        setup before using the dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
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
            <Link href="/doctor/calendar">
              <CalendarDays className="mr-2 h-4 w-4" />
              My Calendar
            </Link>
          </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <TodaySchedule bookings={todayBookings} calendarHref="/doctor/calendar" />
        <UpcomingAppointments
          bookings={upcoming}
          title="Upcoming Consultations"
          viewerRole="admin"
        />
        <OlderAppointments
          bookings={older}
          title="Older Consultations"
          viewerRole="doctor"
        />
      </div>
    </div>
  );
}
