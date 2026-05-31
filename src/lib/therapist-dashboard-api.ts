import { apiRequestPaginated } from './api';
import type { Booking } from './types';
import { listLeaveRequests, type LeaveRequest } from './leave-api';
import { listNotifications } from './notification-api';
import { endOfDay, startOfDay } from './utils';

export async function fetchTherapistTodayBookings(therapistId: string): Promise<Booking[]> {
  const today = new Date();
  const result = await apiRequestPaginated<Booking>(
    `/bookings?therapistId=${therapistId}&dateFrom=${encodeURIComponent(startOfDay(today).toISOString())}&dateTo=${encodeURIComponent(endOfDay(today).toISOString())}&limit=100`,
  );
  return result.data
    .filter((b) => !['CANCELLED', 'RESCHEDULED', 'NO_SHOW'].includes(b.status))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

export async function fetchTherapistUpcomingPatients(
  therapistId: string,
  limit = 8,
): Promise<Booking[]> {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 14);

  const result = await apiRequestPaginated<Booking>(
    `/bookings?therapistId=${therapistId}&dateFrom=${encodeURIComponent(now.toISOString())}&dateTo=${encodeURIComponent(endOfDay(end).toISOString())}&limit=50`,
  );

  return result.data
    .filter((b) => ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'].includes(b.status))
    .filter((b) => new Date(b.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, limit);
}

export async function fetchTherapistLeaveStatus(therapistId: string): Promise<LeaveRequest[]> {
  const result = await listLeaveRequests({ therapistId, limit: 5 });
  return result.data;
}

export async function fetchTherapistNotifications(limit = 8) {
  const result = await listNotifications({ limit, unreadOnly: false });
  return result.data;
}
