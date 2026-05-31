import { apiRequestPaginated } from './api';
import { listLeaveRequests, type LeaveRequest } from './leave-api';
import type { Booking } from './types';
import { endOfDay, startOfDay } from './utils';

export interface TherapistDashboardData {
  todayBookings: Booking[];
  upcoming: Booking[];
  leaves: LeaveRequest[];
}

async function fetchTherapistBookings(therapistId: string): Promise<Booking[]> {
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + 14);

  const result = await apiRequestPaginated<Booking>(
    `/bookings?therapistId=${therapistId}` +
      `&dateFrom=${encodeURIComponent(startOfDay(today).toISOString())}` +
      `&dateTo=${encodeURIComponent(endOfDay(end).toISOString())}&limit=100`,
  );

  return result.data;
}

function splitTherapistBookings(bookings: Booking[]): {
  todayBookings: Booking[];
  upcoming: Booking[];
} {
  const now = new Date();
  const todayStart = startOfDay(now).getTime();
  const todayEnd = endOfDay(now).getTime();

  const todayBookings = bookings
    .filter((b) => {
      const start = new Date(b.startTime).getTime();
      return start >= todayStart && start <= todayEnd;
    })
    .filter((b) => !['CANCELLED', 'RESCHEDULED', 'NO_SHOW'].includes(b.status))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const upcoming = bookings
    .filter((b) => ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'].includes(b.status))
    .filter((b) => new Date(b.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 8);

  return { todayBookings, upcoming };
}

export async function fetchTherapistDashboardData(
  therapistId: string,
): Promise<TherapistDashboardData> {
  const [bookings, leaveResult] = await Promise.all([
    fetchTherapistBookings(therapistId),
    listLeaveRequests({ therapistId, limit: 5 }),
  ]);

  const { todayBookings, upcoming } = splitTherapistBookings(bookings);

  return {
    todayBookings,
    upcoming,
    leaves: leaveResult.data,
  };
}

/** @deprecated Use fetchTherapistDashboardData */
export async function fetchTherapistTodayBookings(therapistId: string): Promise<Booking[]> {
  return (await fetchTherapistDashboardData(therapistId)).todayBookings;
}

/** @deprecated Use fetchTherapistDashboardData */
export async function fetchTherapistUpcomingPatients(
  therapistId: string,
  limit = 8,
): Promise<Booking[]> {
  return (await fetchTherapistDashboardData(therapistId)).upcoming.slice(0, limit);
}

/** @deprecated Use fetchTherapistDashboardData */
export async function fetchTherapistLeaveStatus(therapistId: string): Promise<LeaveRequest[]> {
  return (await fetchTherapistDashboardData(therapistId)).leaves;
}
