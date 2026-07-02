'use client';

import { BookingsNeedsAttentionPanel } from '@/components/booking/bookings-needs-attention-panel';
import { DashboardBookingList } from '@/components/dashboard/dashboard-booking-list';
import { fetchAdminDashboardData } from '@/lib/dashboard-api';
import type { ActivityItem, DashboardStats } from '@/lib/dashboard-api';
import type { Booking, Doctor, Room, Therapist } from '@/lib/types';
import { listDoctors } from '@/lib/doctor-api';
import { listRooms } from '@/lib/room-api';
import { listTherapists } from '@/lib/therapist-api';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { StatCard } from '@/components/dashboard/stat-card';
import { UpcomingAppointments } from '@/components/dashboard/upcoming-appointments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, ClipboardList, RefreshCw, Stethoscope, Users } from 'lucide-react';
import Link from 'next/link';
import { useBackgroundLoadState } from '@/hooks/use-background-load-state';
import { useCallback, useEffect, useState } from 'react';

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayByType, setTodayByType] = useState({ therapy: [] as Booking[], consultation: [] as Booking[] });
  const [upcomingByType, setUpcomingByType] = useState({ therapy: [] as Booking[], consultation: [] as Booking[] });
  const [pendingByType, setPendingByType] = useState({ therapy: [] as Booking[], consultation: [] as Booking[] });
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const { initialLoading, refreshing, beginLoad, endLoad } = useBackgroundLoadState();
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (options?: { background?: boolean }) => {
    beginLoad(options);
    setError(null);
    try {
      const [data, therapistResult, doctorResult, roomResult] = await Promise.all([
        fetchAdminDashboardData(),
        listTherapists({ limit: 100, isActive: true }),
        listDoctors({ limit: 100, isActive: true }),
        listRooms({ limit: 100, isActive: true }),
      ]);
      setStats(data.stats);
      setTodayByType(data.todayByType);
      setUpcomingByType(data.upcomingByType);
      setUpcoming(data.upcoming);
      const pendingAll = data.pendingConfirmationAll;
      setPendingByType({
        therapy: pendingAll.filter((b) => b.bookingType !== 'CONSULTATION'),
        consultation: pendingAll.filter((b) => b.bookingType === 'CONSULTATION'),
      });
      setActivity(data.activity);
      setTherapists(therapistResult.data);
      setDoctors(doctorResult.data);
      setRooms(roomResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      endLoad();
    }
  }, [beginLoad, endLoad]);

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadDashboard({ background: true })}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
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
          value={initialLoading ? '—' : (stats?.totalPatients ?? 0)}
          icon={Users}
          accent="bg-blue-100 text-blue-700"
        />
        <StatCard
          title="Active Therapists"
          value={initialLoading ? '—' : (stats?.activeTherapists ?? 0)}
          icon={Stethoscope}
          accent="bg-violet-100 text-violet-700"
        />
        <StatCard
          title="Today's Bookings"
          value={initialLoading ? '—' : (stats?.todaysBookings ?? 0)}
          icon={CalendarDays}
          accent="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          title="Pending Leave Requests"
          value={initialLoading ? '—' : (stats?.pendingLeaveRequests ?? 0)}
          icon={ClipboardList}
          accent="bg-amber-100 text-amber-700"
          description="Awaiting approval"
        />
      </div>

      <BookingsNeedsAttentionPanel
        compact
        onActionComplete={() => void loadDashboard({ background: true })}
      />

      <div className="grid gap-6 lg:grid-cols-5 xl:grid-cols-2">
        <div className="min-w-0 space-y-6 lg:col-span-3 xl:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Today&apos;s Appointments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!initialLoading &&
              todayByType.therapy.length === 0 &&
              todayByType.consultation.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No appointments scheduled today
                </p>
              ) : (
                <DashboardBookingList
                  title="Today's Appointments"
                  therapyBookings={todayByType.therapy}
                  consultationBookings={todayByType.consultation}
                  showPostponeCancel
                  hideHeader
                  therapists={therapists}
                  doctors={doctors}
                  rooms={rooms}
                  onActionComplete={() => void loadDashboard({ background: true })}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-6 lg:col-span-2 xl:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Upcoming Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No upcoming appointments</p>
              ) : (
                <div className="space-y-6">
                  <DashboardBookingList
                    title="Upcoming Bookings"
                    therapyBookings={upcomingByType.therapy}
                    consultationBookings={upcomingByType.consultation}
                    showPostponeCancel
                    hideHeader
                    compact
                    therapists={therapists}
                    doctors={doctors}
                    rooms={rooms}
                    onActionComplete={() => void loadDashboard({ background: true })}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {(pendingByType.therapy.length > 0 || pendingByType.consultation.length > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Pending Confirmation</CardTitle>
              </CardHeader>
              <CardContent>
                <DashboardBookingList
                  title="Pending Confirmation"
                  therapyBookings={pendingByType.therapy}
                  consultationBookings={pendingByType.consultation}
                  showPendingActions
                  hideHeader
                  compact
                  therapists={therapists}
                  doctors={doctors}
                  rooms={rooms}
                  viewMoreHref="/admin/appointments/pending-confirmation"
                  onActionComplete={() => void loadDashboard({ background: true })}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <RecentActivity items={activity} viewMoreHref="/admin/activity-log" />
    </div>
  );
}
