import { apiRequestPaginated } from './api';
import { listBookings } from './booking-api';
import type { Booking } from './types';
import { endOfDay, formatDateTime, startOfDay } from './utils';

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

export interface TypedBookings {
  therapy: Booking[];
  consultation: Booking[];
}

export interface AdminDashboardData {
  stats: DashboardStats;
  todayBookings: Booking[];
  todayByType: TypedBookings;
  pendingConfirmationToday: Booking[];
  pendingConfirmationOlder: Booking[];
  pendingConfirmationAll: Booking[];
  upcoming: Booking[];
  upcomingByType: TypedBookings;
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

function splitByBookingType(bookings: Booking[]): TypedBookings {
  return {
    therapy: bookings.filter((b) => b.bookingType !== 'CONSULTATION'),
    consultation: bookings.filter((b) => b.bookingType === 'CONSULTATION'),
  };
}

function deriveUpcomingBookings(bookings: Booking[]): Booking[] {
  const now = new Date();

  return bookings
    .filter((b) => ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'].includes(b.status))
    .filter((b) => new Date(b.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

function derivePendingConfirmation(bookings: Booking[], scope: 'today' | 'older'): Booking[] {
  const todayStart = startOfDay(new Date()).getTime();
  const todayEnd = endOfDay(new Date()).getTime();

  return bookings
    .filter((b) => b.status === 'PENDING_CONFIRMATION')
    .filter((b) => {
      const start = new Date(b.startTime).getTime();
      if (scope === 'today') {
        return start >= todayStart && start <= todayEnd;
      }
      return start < todayStart || start > todayEnd;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

function deriveRecentActivity(bookings: Booking[], limit = 5): ActivityItem[] {
  const items: ActivityItem[] = bookings.map((booking) => {
    const patient = `${booking.patient.firstName} ${booking.patient.lastName}`;
    const label =
      booking.bookingType === 'CONSULTATION'
        ? booking.doctor
          ? `Dr. ${booking.doctor.user.firstName} ${booking.doctor.user.lastName}`
          : 'Consultation'
        : (booking.therapy?.name ?? 'Appointment');
    const time = `${label} · ${formatDateTime(booking.startTime)}`;

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

  const [totalPatients, activeTherapists, pendingLeaveRequests, bookingsResult, pendingResult] =
    await Promise.all([
    fetchTotal('/patients?isActive=true'),
    fetchTotal('/therapists?isActive=true'),
    fetchTotal('/leave-requests?status=PENDING'),
    apiRequestPaginated<Booking>(bookingsPath),
    listBookings({ status: 'PENDING_CONFIRMATION', limit: 50, sort: 'default' }),
  ]);

  const allBookings = bookingsResult.data;
  const pendingConfirmationAll = pendingResult.data;
  const todayStart = startOfDay(today).getTime();
  const todayEnd = endOfDay(today).getTime();
  const todaysBookingsRaw = allBookings.filter((b) => {
    const start = new Date(b.startTime).getTime();
    return start >= todayStart && start <= todayEnd;
  });

  const todayBookings = filterTodaysBookings(todaysBookingsRaw);
  const upcoming = deriveUpcomingBookings(allBookings);

  return {
    stats: {
      totalPatients,
      activeTherapists,
      todaysBookings: countTodaysActiveBookings(todaysBookingsRaw),
      pendingLeaveRequests,
    },
    todayBookings,
    todayByType: splitByBookingType(todayBookings),
    pendingConfirmationToday: derivePendingConfirmation(pendingConfirmationAll, 'today'),
    pendingConfirmationOlder: derivePendingConfirmation(pendingConfirmationAll, 'older'),
    pendingConfirmationAll,
    upcoming,
    upcomingByType: splitByBookingType(upcoming),
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
  startDateTime: string;
  endDateTime: string;
  reason: string;
  therapist: {
    id: string;
    user: { firstName: string; lastName: string };
  };
  createdAt: string;
}
