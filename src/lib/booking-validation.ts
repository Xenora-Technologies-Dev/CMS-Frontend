import type { Booking, BookingStatus, Therapist, TherapistAvailability } from '@/lib/types';
import {
  combineDateAndTime,
  formatTime,
  generateTimeSlots,
  getPatientName,
  getTherapistName,
  parseDateInput,
  startOfDay,
} from '@/lib/utils';

const ACTIVE_STATUSES: BookingStatus[] = ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'];

const WEEKDAY_TO_ENUM = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

export interface SlotValidationInput {
  date: string;
  startTime: string;
  durationMinutes: number;
  therapistId: string;
  roomId: string;
  therapist?: Therapist;
  availability?: TherapistAvailability[];
  dayBookings?: Booking[];
  /** Exclude this booking from conflict checks (edit / reschedule preview). */
  excludeBookingId?: string;
}

export interface SlotValidationIssue {
  type: 'error' | 'warning';
  message: string;
}

export interface SlotOccupancyItem {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  kind: 'therapist' | 'room' | 'proposed';
  conflict?: boolean;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function rangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && endA > startB;
}

function isWithinTimeRange(rangeStart: string, rangeEnd: string, slotStart: string, slotEnd: string) {
  return (
    timeToMinutes(slotStart) >= timeToMinutes(rangeStart) &&
    timeToMinutes(slotEnd) <= timeToMinutes(rangeEnd)
  );
}

export function computeEndTimeFromSlot(date: string, startTime: string, durationMinutes: number): Date {
  const start = combineDateAndTime(parseDateInput(date), startTime);
  return new Date(start.getTime() + durationMinutes * 60 * 1000);
}

export function validateBookingSlot(input: SlotValidationInput): SlotValidationIssue[] {
  const issues: SlotValidationIssue[] = [];

  if (!input.date || !input.startTime || !input.durationMinutes) {
    return issues;
  }

  const start = combineDateAndTime(parseDateInput(input.date), input.startTime);
  const end = computeEndTimeFromSlot(input.date, input.startTime, input.durationMinutes);
  const now = new Date();

  if (timeToMinutes(input.startTime) % 15 !== 0) {
    issues.push({ type: 'error', message: 'Start time must align to 15-minute intervals' });
  }

  if (start < now) {
    issues.push({ type: 'error', message: 'Cannot schedule bookings in the past' });
  }

  if (start >= end) {
    issues.push({ type: 'error', message: 'Invalid booking duration' });
  }

  const slotStart = input.startTime;
  const slotEnd = formatTime(end);

  if (input.therapist?.consultationStartTime && input.therapist.consultationEndTime) {
    if (
      !isWithinTimeRange(
        input.therapist.consultationStartTime,
        input.therapist.consultationEndTime,
        slotStart,
        slotEnd,
      )
    ) {
      issues.push({
        type: 'error',
        message: `Outside consultation hours (${input.therapist.consultationStartTime}–${input.therapist.consultationEndTime})`,
      });
    }
  }

  if (input.availability && input.availability.length > 0) {
    const bookingDate = startOfDay(parseDateInput(input.date));
    const dayOfWeek = WEEKDAY_TO_ENUM[bookingDate.getDay()];

    const activeSlots = input.availability.filter((slot) => {
      if (!slot.isActive) return false;
      if (slot.effectiveFrom) {
        const from = startOfDay(new Date(slot.effectiveFrom));
        if (bookingDate < from) return false;
      }
      if (slot.effectiveTo) {
        const to = startOfDay(new Date(slot.effectiveTo));
        if (bookingDate > to) return false;
      }
      return true;
    });

    if (activeSlots.length > 0) {
      const matchesAvailability = activeSlots.some((slot) => {
        if (slot.specificDate) {
          const specific = startOfDay(new Date(slot.specificDate));
          if (specific.getTime() !== bookingDate.getTime()) return false;
        } else if (slot.dayOfWeek) {
          if (slot.dayOfWeek !== dayOfWeek) return false;
        } else {
          return false;
        }

        return isWithinTimeRange(slot.startTime, slot.endTime, slotStart, slotEnd);
      });

      if (!matchesAvailability) {
        issues.push({
          type: 'error',
          message: 'Booking falls outside therapist availability',
        });
      }
    }
  }

  const activeBookings = (input.dayBookings ?? []).filter((b) => ACTIVE_STATUSES.includes(b.status));

  const therapistConflict = activeBookings.find(
    (b) =>
      b.id !== input.excludeBookingId &&
      b.therapistId === input.therapistId &&
      rangesOverlap(start, end, new Date(b.startTime), new Date(b.endTime)),
  );
  if (therapistConflict) {
    const roomName = therapistConflict.room?.name ?? 'Room';
    issues.push({
      type: 'error',
      message: `Therapist already booked ${formatTime(therapistConflict.startTime)}–${formatTime(therapistConflict.endTime)} with ${getPatientName(therapistConflict.patient)} (${roomName})`,
    });
  }

  const roomConflict = activeBookings.find(
    (b) =>
      b.id !== input.excludeBookingId &&
      b.roomId === input.roomId &&
      rangesOverlap(start, end, new Date(b.startTime), new Date(b.endTime)),
  );
  if (roomConflict) {
    issues.push({
      type: 'error',
      message: `Room already booked ${formatTime(roomConflict.startTime)}–${formatTime(roomConflict.endTime)} with ${getPatientName(roomConflict.patient)} (${getTherapistName(roomConflict.therapist)})`,
    });
  }

  return issues;
}

export function buildSlotOccupancyPreview(input: SlotValidationInput): SlotOccupancyItem[] {
  if (!input.date || !input.startTime || !input.durationMinutes || !input.therapistId || !input.roomId) {
    return [];
  }

  const start = combineDateAndTime(parseDateInput(input.date), input.startTime);
  const end = computeEndTimeFromSlot(input.date, input.startTime, input.durationMinutes);
  const activeBookings = (input.dayBookings ?? []).filter((b) => ACTIVE_STATUSES.includes(b.status));

  const items: SlotOccupancyItem[] = activeBookings
    .filter(
      (b) =>
        b.id !== input.excludeBookingId &&
        (b.therapistId === input.therapistId || b.roomId === input.roomId),
    )
    .map((b) => ({
      id: b.id,
      label: `${getPatientName(b.patient)} · ${getTherapistName(b.therapist)}`,
      startTime: b.startTime,
      endTime: b.endTime,
      kind: b.therapistId === input.therapistId ? 'therapist' : 'room',
      conflict: rangesOverlap(start, end, new Date(b.startTime), new Date(b.endTime)),
    }));

  items.push({
    id: 'proposed',
    label: 'Proposed booking',
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    kind: 'proposed',
    conflict: items.some((item) => item.conflict),
  });

  return items.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
}

export function getPreviewTimeBounds() {
  const slots = generateTimeSlots(8, 18, 15);
  const dayStart = timeToMinutes(slots[0]);
  const dayEnd = timeToMinutes(slots[slots.length - 1]) + 15;
  return { dayStart, dayEnd, slots };
}

export function getSlotPosition(startIso: string, endIso: string, dayStart: number, dayEnd: number) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();
  const total = dayEnd - dayStart;
  const left = ((startMin - dayStart) / total) * 100;
  const width = ((endMin - startMin) / total) * 100;
  return {
    left: Math.max(0, left),
    width: Math.max(2, Math.min(100 - left, width)),
  };
}
