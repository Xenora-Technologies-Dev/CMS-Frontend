import type { Booking, BookingStatus } from '@/lib/types';

const ACTIVE_STATUSES: BookingStatus[] = ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'];

export function isUpcomingBooking(booking: Booking): boolean {
  if (!ACTIVE_STATUSES.includes(booking.status)) return false;
  return new Date(booking.startTime) >= new Date();
}

export function getAppointmentCardBorderClass(booking: Booking): string {
  if (booking.status === 'COMPLETED') return 'border-l-4 border-l-emerald-500';
  if (booking.status === 'CANCELLED') return 'border-l-4 border-l-red-500';
  if (booking.status === 'RESCHEDULED') return 'border-l-4 border-l-orange-500';
  if (isUpcomingBooking(booking)) return 'border-l-4 border-l-blue-500';
  return 'border-l-4 border-l-slate-300';
}

export function canEditBooking(booking: Booking): boolean {
  return ['SCHEDULED', 'CONFIRMED'].includes(booking.status);
}

export function canRestoreBooking(booking: Booking): boolean {
  return booking.status === 'CANCELLED';
}

export function formatUserName(user?: { firstName: string; lastName: string } | null): string {
  if (!user) return '—';
  return `${user.firstName} ${user.lastName}`.trim();
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
