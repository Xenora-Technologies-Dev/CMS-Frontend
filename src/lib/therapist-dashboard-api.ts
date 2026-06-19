import { apiRequestPaginated } from './api';
import { listLeaveRequests, type LeaveRequest } from './leave-api';
import type { Booking } from './types';
import { endOfDay, startOfDay } from './utils';

export interface StaffDashboardData {
  todayBookings: Booking[];
  upcoming: Booking[];
  older: Booking[];
  leaves: LeaveRequest[];
}

function splitStaffBookings(bookings: Booking[]): {
  todayBookings: Booking[];
  upcoming: Booking[];
  older: Booking[];
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
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const older = bookings
    .filter((b) => new Date(b.startTime).getTime() < todayStart)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return { todayBookings, upcoming, older };
}

async function fetchStaffBookings(params: {
  therapistId?: string;
  doctorId?: string;
}): Promise<Booking[]> {
  const today = new Date();
  const pastStart = new Date(today);
  pastStart.setDate(pastStart.getDate() - 30);
  const futureEnd = new Date(today);
  futureEnd.setDate(futureEnd.getDate() + 14);

  const searchParams = new URLSearchParams({
    dateFrom: startOfDay(pastStart).toISOString(),
    dateTo: endOfDay(futureEnd).toISOString(),
    limit: '150',
  });
  if (params.therapistId) searchParams.set('therapistId', params.therapistId);
  if (params.doctorId) searchParams.set('doctorId', params.doctorId);

  const result = await apiRequestPaginated<Booking>(`/bookings?${searchParams.toString()}`);
  return result.data;
}

export async function fetchTherapistDashboardData(
  therapistId: string,
): Promise<StaffDashboardData> {
  const [bookings, leaveResult] = await Promise.all([
    fetchStaffBookings({ therapistId }),
    listLeaveRequests({ therapistId, limit: 5 }),
  ]);

  const { todayBookings, upcoming, older } = splitStaffBookings(bookings);

  return {
    todayBookings,
    upcoming,
    older,
    leaves: leaveResult.data,
  };
}

export async function fetchDoctorDashboardData(doctorId: string): Promise<Omit<StaffDashboardData, 'leaves'>> {
  const bookings = await fetchStaffBookings({ doctorId });
  const { todayBookings, upcoming, older } = splitStaffBookings(bookings);
  return { todayBookings, upcoming, older };
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
