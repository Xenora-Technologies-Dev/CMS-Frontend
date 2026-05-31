'use client';

import {
  fetchDashboardStats,
  fetchRecentActivity,
  fetchTodaysBookings,
  fetchUpcomingBookings,
} from '@/lib/dashboard-api';
import type { ActivityItem, DashboardStats } from '@/lib/dashboard-api';
import type { Booking } from '@/lib/types';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { StatCard } from '@/components/dashboard/stat-card';
import { TodaySchedule } from '@/components/dashboard/today-schedule';
import { UpcomingAppointments } from '@/components/dashboard/upcoming-appointments';
import { Button } from '@/components/ui/button';
import { CalendarDays, ClipboardList, RefreshCw, Stethoscope, Users } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, today, upcomingData, activityData] = await Promise.all([
        fetchDashboardStats(),
        fetchTodaysBookings(),
        fetchUpcomingBookings(),
        fetchRecentActivity(),
      ]);
      setStats(statsData);
      setTodayBookings(today);
      setUpcoming(upcomingData);
      setActivity(activityData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Clinic overview for today</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadDashboard()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" asChild>
            <Link href="/admin/appointments/calendar">Open Calendar</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Patients"
          value={loading ? '—' : (stats?.totalPatients ?? 0)}
          icon={Users}
          accent="bg-blue-100 text-blue-700"
        />
        <StatCard
          title="Active Therapists"
          value={loading ? '—' : (stats?.activeTherapists ?? 0)}
          icon={Stethoscope}
          accent="bg-violet-100 text-violet-700"
        />
        <StatCard
          title="Today's Bookings"
          value={loading ? '—' : (stats?.todaysBookings ?? 0)}
          icon={CalendarDays}
          accent="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          title="Pending Leave Requests"
          value={loading ? '—' : (stats?.pendingLeaveRequests ?? 0)}
          icon={ClipboardList}
          accent="bg-amber-100 text-amber-700"
          description="Awaiting approval"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TodaySchedule bookings={todayBookings} />
        </div>
        <div>
          <UpcomingAppointments bookings={upcoming} />
        </div>
      </div>

      <RecentActivity items={activity} />
    </div>
  );
}
