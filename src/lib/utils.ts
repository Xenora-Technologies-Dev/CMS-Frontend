import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateInput(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export function toTimeInputValue(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Display an HH:mm value in 12-hour format (e.g. 14:30 → 2:30 PM). */
export function formatTimeInputValue(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return formatTime(d);
}

export function generateTimeSlots(startHour = 8, endHour = 18, intervalMinutes = 15): string[] {
  const slots: string[] = [];
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    }
  }
  return slots;
}

export function getTherapistColor(colorCode?: string | null): string {
  return colorCode && /^#[0-9A-Fa-f]{6}$/.test(colorCode) ? colorCode : '#3B82F6';
}

export function getDoctorColor(colorCode?: string | null): string {
  return colorCode && /^#[0-9A-Fa-f]{6}$/.test(colorCode) ? colorCode : '#7C3AED';
}

export function getDoctorName(doctor: {
  user: { firstName: string; lastName: string };
}): string {
  return `${doctor.user.firstName} ${doctor.user.lastName}`;
}

export function getBookingStaffColor(booking: {
  bookingType?: string;
  therapist?: { colorCode?: string | null } | null;
  doctor?: { colorCode?: string | null } | null;
}): string {
  if (booking.bookingType === 'CONSULTATION' && booking.doctor) {
    return getDoctorColor(booking.doctor.colorCode);
  }
  if (booking.therapist) {
    return getTherapistColor(booking.therapist.colorCode);
  }
  return '#3B82F6';
}

/** Convert hex color to rgba for cell backgrounds. */
export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return `rgba(59, 130, 246, ${alpha})`;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getPatientName(patient: { firstName: string; lastName: string }): string {
  return `${patient.firstName} ${patient.lastName}`;
}

export function getTherapistName(therapist: {
  user: { firstName: string; lastName: string };
}): string {
  return `${therapist.user.firstName} ${therapist.user.lastName}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

export function formatCurrency(amount: string | number | null | undefined, currency = 'AED'): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) return '—';
  return new Intl.NumberFormat('en-AE', { style: 'currency', currency }).format(num);
}

export function toDateInputValue(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDateInput(d);
}
