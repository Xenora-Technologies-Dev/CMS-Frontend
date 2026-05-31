import { apiRequestPaginated } from './api';
import type { Booking } from './types';
import { endOfDay, startOfDay } from './utils';

export interface DashboardStats {
  totalPatients: number;
  activeTherapists: number;
  todaysBookings: number;
  pendingLeaveRequests: number;
}

export interface ActivityItem {
  id: string;
  label: string;
  detail: string;
  timestamp: string;
  type: 'booking' | 'cancel' | 'complete' | 'create';
}

export interface AdminDashboardData {
  stats: DashboardStats;
  todayBookings: Booking[];
  upcoming: Booking[];
  activity: ActivityItem[];
}

async function fetchTotal(path: string): Promise<number> {
  const result = await apiRequestPaginated<unknown>(
    `${path}${path.includes('?') ? '&' : '?'}limit=1`,
  );
  return result.meta.total;
}

function filterTodaysBookings(bookings: Booking[]): Booking[] {
  return bookings
    .filter((b) => !['CANCELLED', 'RESCHEDULED', 'NO_SHOW'].includes(b.status))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

function deriveUpcomingBookings(bookings: Booking[], limit = 8): Booking[] {
  const now = new Date();

  return bookings
    .filter((b) => ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'].includes(b.status))
    .filter((b) => new Date(b.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, limit);
}

function deriveRecentActivity(bookings: Booking[], limit = 10): ActivityItem[] {
  const items: ActivityItem[] = bookings.map((booking) => {
    const patient = `${booking.patient.firstName} ${booking.patient.lastName}`;
    const time = `${booking.therapy.name} · ${new Date(booking.startTime).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })}`;

    if (booking.status === 'CANCELLED') {
      return {
        id: booking.id,
        label: `Booking cancelled — ${patient}`,
        detail: booking.cancellationReason ?? time,
        timestamp: booking.updatedAt ?? booking.createdAt ?? booking.startTime,
        type: 'cancel' as const,
      };
    }

    if (booking.status === 'COMPLETED') {
      return {
        id: booking.id,
        label: `Session completed — ${patient}`,
        detail: time,
        timestamp: booking.updatedAt ?? booking.startTime,
        type: 'complete' as const,
      };
    }

    return {
      id: booking.id,
      label: `Booking scheduled — ${patient}`,
      detail: time,
      timestamp: booking.createdAt ?? booking.startTime,
      type: 'create' as const,
    };
  });

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

function countTodaysActiveBookings(bookings: Booking[]): number {
  return bookings.filter((b) => !['CANCELLED', 'RESCHEDULED', 'NO_SHOW'].includes(b.status)).length;
}

export async function fetchAdminDashboardData(): Promise<AdminDashboardData> {
  const today = new Date();
  const activityStart = new Date(today);
  activityStart.setDate(activityStart.getDate() - 7);
  const upcomingEnd = new Date(today);
  upcomingEnd.setDate(upcomingEnd.getDate() + 14);

  const bookingsPath =
    `/bookings?dateFrom=${encodeURIComponent(startOfDay(activityStart).toISOString())}` +
    `&dateTo=${encodeURIComponent(endOfDay(upcomingEnd).toISOString())}&limit=200`;

  const [totalPatients, activeTherapists, pendingLeaveRequests, bookingsResult] = await Promise.all([
    fetchTotal('/patients?isActive=true'),
    fetchTotal('/therapists?isActive=true'),
    fetchTotal('/leave-requests?status=PENDING'),
    apiRequestPaginated<Booking>(bookingsPath),
  ]);

  const allBookings = bookingsResult.data;
  const todayStart = startOfDay(today).getTime();
  const todayEnd = endOfDay(today).getTime();
  const todaysBookingsRaw = allBookings.filter((b) => {
    const start = new Date(b.startTime).getTime();
    return start >= todayStart && start <= todayEnd;
  });

  return {
    stats: {
      totalPatients,
      activeTherapists,
      todaysBookings: countTodaysActiveBookings(todaysBookingsRaw),
      pendingLeaveRequests,
    },
    todayBookings: filterTodaysBookings(todaysBookingsRaw),
    upcoming: deriveUpcomingBookings(allBookings),
    activity: deriveRecentActivity(allBookings),
  };
}

/** @deprecated Use fetchAdminDashboardData */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  return (await fetchAdminDashboardData()).stats;
}

/** @deprecated Use fetchAdminDashboardData */
export async function fetchTodaysBookings(limit = 100): Promise<Booking[]> {
  const data = await fetchAdminDashboardData();
  return data.todayBookings.slice(0, limit);
}

/** @deprecated Use fetchAdminDashboardData */
export async function fetchUpcomingBookings(limit = 8): Promise<Booking[]> {
  const data = await fetchAdminDashboardData();
  return data.upcoming.slice(0, limit);
}

/** @deprecated Use fetchAdminDashboardData */
export async function fetchRecentActivity(limit = 10): Promise<ActivityItem[]> {
  const data = await fetchAdminDashboardData();
  return data.activity.slice(0, limit);
}

export interface LeaveRequestItem {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  startDate: string;
  endDate: string;
  reason: string;
  therapist: {
    id: string;
    user: { firstName: string; lastName: string };
  };
  createdAt: string;
}
