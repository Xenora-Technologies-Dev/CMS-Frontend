import { apiRequestPaginated } from './api';
import type { Booking } from './types';
import { endOfDay, startOfDay } from './utils';

export interface DashboardStats {
  totalPatients: number;
  activeTherapists: number;
  todaysBookings: number;
  pendingLeaveRequests: number;
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

async function fetchTotal(path: string): Promise<number> {
  const result = await apiRequestPaginated<unknown>(
    `${path}${path.includes('?') ? '&' : '?'}limit=1`,
  );
  return result.meta.total;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const today = new Date();
  const dateFrom = startOfDay(today).toISOString();
  const dateTo = endOfDay(today).toISOString();

  const [totalPatients, activeTherapists, todaysBookings, pendingLeaveRequests] =
    await Promise.all([
      fetchTotal('/patients?isActive=true'),
      fetchTotal('/therapists?isActive=true'),
      fetchTotal(`/bookings?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`),
      fetchTotal('/leave-requests?status=PENDING'),
    ]);

  return { totalPatients, activeTherapists, todaysBookings, pendingLeaveRequests };
}

export async function fetchTodaysBookings(limit = 100): Promise<Booking[]> {
  const today = new Date();
  const result = await apiRequestPaginated<Booking>(
    `/bookings?dateFrom=${encodeURIComponent(startOfDay(today).toISOString())}&dateTo=${encodeURIComponent(endOfDay(today).toISOString())}&limit=${limit}`,
  );
  return result.data
    .filter((b) => !['CANCELLED', 'RESCHEDULED', 'NO_SHOW'].includes(b.status))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

export async function fetchUpcomingBookings(limit = 8): Promise<Booking[]> {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 14);

  const result = await apiRequestPaginated<Booking>(
    `/bookings?dateFrom=${encodeURIComponent(now.toISOString())}&dateTo=${encodeURIComponent(endOfDay(end).toISOString())}&limit=${limit}`,
  );

  return result.data
    .filter((b) => ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'].includes(b.status))
    .filter((b) => new Date(b.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, limit);
}

export interface ActivityItem {
  id: string;
  label: string;
  detail: string;
  timestamp: string;
  type: 'booking' | 'cancel' | 'complete' | 'create';
}

export async function fetchRecentActivity(limit = 10): Promise<ActivityItem[]> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);

  const result = await apiRequestPaginated<Booking>(
    `/bookings?dateFrom=${encodeURIComponent(startOfDay(start).toISOString())}&dateTo=${encodeURIComponent(endOfDay(end).toISOString())}&limit=100`,
  );

  const items: ActivityItem[] = result.data.map((booking) => {
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
