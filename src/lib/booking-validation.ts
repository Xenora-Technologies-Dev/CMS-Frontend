import type {
  Booking,
  BookingStatus,
  Doctor,
  PublicHoliday,
  Therapist,
  TherapistAvailability,
} from '@/lib/types';
import {
  combineDateAndTime,
  endOfDay,
  formatTime,
  formatTimeInputValue,
  generateTimeSlots,
  getPatientName,
  getTherapistName,
  parseDateInput,
  startOfDay,
  toTimeInputValue,
  formatDateInput,
} from '@/lib/utils';

const ACTIVE_STATUSES: BookingStatus[] = [
  'SCHEDULED',
  'CONFIRMED',
  'IN_PROGRESS',
  'PENDING_CONFIRMATION',
];

const WEEKDAY_TO_ENUM = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

export interface ApprovedLeaveBlock {
  startDateTime: string;
  endDateTime: string;
  isFullDay?: boolean;
}

export interface SlotValidationInput {
  date: string;
  startTime: string;
  durationMinutes: number;
  therapistId: string;
  roomId: string;
  therapist?: Therapist;
  availability?: TherapistAvailability[];
  dayBookings?: Booking[];
  approvedLeaves?: ApprovedLeaveBlock[];
  /** Exclude this booking from conflict checks (edit / reschedule preview). */
  excludeBookingId?: string;
}

export interface SlotValidationIssue {
  type: 'error' | 'warning';
  message: string;
  code?:
    | 'consultation_hours'
    | 'availability'
    | 'therapist_conflict'
    | 'room_conflict'
    | 'past'
    | 'slot_alignment'
    | 'duration'
    | 'leave'
    | 'other';
}

export interface SlotValidationOptions {
  overrideScheduleConstraints?: boolean;
  /** Skip past-time check when editing metadata on an existing booking slot. */
  skipPastValidation?: boolean;
}

export interface AvailableWindow {
  start: string;
  end: string;
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  label: string;
}

export interface ScheduleSlot extends AvailableSlot {
  available: boolean;
}

interface MinuteWindow {
  startMin: number;
  endMin: number;
}

function bookingOnLocalDate(booking: Booking, date: string): boolean {
  return formatDateInput(new Date(booking.startTime)) === date;
}

function getTherapistBookingBlocks(
  dayBookings: Booking[],
  therapistId: string,
  date: string,
  excludeBookingId?: string,
): MinuteWindow[] {
  return dayBookings
    .filter(
      (b) =>
        bookingOnLocalDate(b, date) &&
        ACTIVE_STATUSES.includes(b.status) &&
        b.therapistId === therapistId &&
        b.id !== excludeBookingId,
    )
    .map((b) => ({
      startMin: timeToMinutes(toTimeInputValue(b.startTime)),
      endMin: timeToMinutes(toTimeInputValue(b.endTime)),
    }));
}

function hasTherapistConflictAtSlot(
  dayBookings: Booking[],
  therapistId: string,
  date: string,
  startTime: string,
  durationMinutes: number,
  excludeBookingId?: string,
): boolean {
  const start = combineDateAndTime(parseDateInput(date), startTime);
  const end = computeEndTimeFromSlot(date, startTime, durationMinutes);
  return dayBookings.some(
    (b) =>
      b.id !== excludeBookingId &&
      bookingOnLocalDate(b, date) &&
      ACTIVE_STATUSES.includes(b.status) &&
      b.therapistId === therapistId &&
      rangesOverlap(start, end, new Date(b.startTime), new Date(b.endTime)),
  );
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getDayAvailabilityMinuteWindows(
  date: string,
  availability: TherapistAvailability[],
): MinuteWindow[] {
  const bookingDate = startOfDay(parseDateInput(date));
  const dayOfWeek = WEEKDAY_TO_ENUM[bookingDate.getDay()];

  return availability
    .filter((slot) => {
      if (!slot.isActive) return false;
      if (slot.effectiveFrom) {
        const from = startOfDay(new Date(slot.effectiveFrom));
        if (bookingDate < from) return false;
      }
      if (slot.effectiveTo) {
        const to = startOfDay(new Date(slot.effectiveTo));
        if (bookingDate > to) return false;
      }
      if (slot.specificDate) {
        return startOfDay(new Date(slot.specificDate)).getTime() === bookingDate.getTime();
      }
      if (slot.dayOfWeek) {
        return slot.dayOfWeek === dayOfWeek;
      }
      return false;
    })
    .map((slot) => ({
      startMin: timeToMinutes(slot.startTime),
      endMin: timeToMinutes(slot.endTime),
    }));
}

function intersectMinuteWindows(a: MinuteWindow[], b: MinuteWindow[]): MinuteWindow[] {
  const result: MinuteWindow[] = [];
  for (const left of a) {
    for (const right of b) {
      const startMin = Math.max(left.startMin, right.startMin);
      const endMin = Math.min(left.endMin, right.endMin);
      if (startMin < endMin) result.push({ startMin, endMin });
    }
  }
  return result;
}

function subtractMinuteBlocks(windows: MinuteWindow[], blocks: MinuteWindow[]): MinuteWindow[] {
  let free = [...windows];
  for (const block of blocks.sort((a, b) => a.startMin - b.startMin)) {
    const next: MinuteWindow[] = [];
    for (const window of free) {
      if (block.endMin <= window.startMin || block.startMin >= window.endMin) {
        next.push(window);
        continue;
      }
      if (block.startMin > window.startMin) {
        next.push({ startMin: window.startMin, endMin: block.startMin });
      }
      if (block.endMin < window.endMin) {
        next.push({ startMin: block.endMin, endMin: window.endMin });
      }
    }
    free = next;
  }
  return free;
}

function leaveOverlapsLocalDate(leave: ApprovedLeaveBlock, date: string): boolean {
  const dayStart = startOfDay(parseDateInput(date));
  const dayEnd = endOfDay(parseDateInput(date));
  const leaveStart = new Date(leave.startDateTime);
  const leaveEnd = new Date(leave.endDateTime);
  return leaveStart < dayEnd && leaveEnd > dayStart;
}

function getLeaveMinuteBlocks(
  approvedLeaves: ApprovedLeaveBlock[] | undefined,
  date: string,
): MinuteWindow[] {
  if (!approvedLeaves?.length) return [];

  return approvedLeaves
    .filter((leave) => leaveOverlapsLocalDate(leave, date))
    .map((leave) => {
      if (leave.isFullDay) {
        return { startMin: 0, endMin: 24 * 60 };
      }
      const leaveStart = new Date(leave.startDateTime);
      const leaveEnd = new Date(leave.endDateTime);
      const dayStart = startOfDay(parseDateInput(date));
      const startMin = Math.max(
        0,
        Math.floor((leaveStart.getTime() - dayStart.getTime()) / 60000),
      );
      const endMin = Math.min(
        24 * 60,
        Math.ceil((leaveEnd.getTime() - dayStart.getTime()) / 60000),
      );
      return { startMin, endMin };
    })
    .filter((block) => block.startMin < block.endMin);
}

export function computeAvailableWindows(input: {
  date: string;
  durationMinutes: number;
  therapist?: Therapist;
  availability?: TherapistAvailability[];
  dayBookings?: Booking[];
  approvedLeaves?: ApprovedLeaveBlock[];
  excludeBookingId?: string;
  overrideScheduleConstraints?: boolean;
}): AvailableWindow[] {
  if (!input.date || !input.durationMinutes || !input.therapist) return [];

  let windows: MinuteWindow[];

  if (input.overrideScheduleConstraints) {
    windows = [{ startMin: 0, endMin: 24 * 60 }];
  } else {
    const hasConsultationHours = Boolean(
      input.therapist.consultationStartTime && input.therapist.consultationEndTime,
    );
    const applyConsultationHours =
      input.therapist.requiresConsultationHours !== false && hasConsultationHours;
    const consultWindow: MinuteWindow | null = applyConsultationHours
      ? {
          startMin: timeToMinutes(input.therapist.consultationStartTime!),
          endMin: timeToMinutes(input.therapist.consultationEndTime!),
        }
      : null;

    const availabilityWindows = getDayAvailabilityMinuteWindows(
      input.date,
      input.availability ?? [],
    );

    if (availabilityWindows.length > 0) {
      windows = availabilityWindows;
      if (consultWindow) {
        windows = intersectMinuteWindows(windows, [consultWindow]);
      }
    } else if (consultWindow) {
      windows = [consultWindow];
    } else {
      windows = [{ startMin: 0, endMin: 24 * 60 }];
    }
  }

  const therapistBookings = getTherapistBookingBlocks(
    input.dayBookings ?? [],
    input.therapist!.id,
    input.date,
    input.excludeBookingId,
  );

  const leaveBlocks = getLeaveMinuteBlocks(input.approvedLeaves, input.date);

  const free = subtractMinuteBlocks(
    subtractMinuteBlocks(windows, therapistBookings),
    leaveBlocks,
  );

  return free
    .filter((w) => w.endMin - w.startMin >= input.durationMinutes)
    .map((w) => ({ start: minutesToTime(w.startMin), end: minutesToTime(w.endMin) }));
}

export function computeScheduleSlots(input: {
  windows: AvailableWindow[];
  durationMinutes: number;
  date?: string;
  dayBookings?: Booking[];
  therapistId?: string;
  excludeBookingId?: string;
}): ScheduleSlot[] {
  const { windows, durationMinutes, date, dayBookings, therapistId, excludeBookingId } = input;
  if (!durationMinutes || windows.length === 0) return [];

  const slots: ScheduleSlot[] = [];
  const now = new Date();
  const isToday = date ? formatDateInput(now) === date : false;
  const nowMin = isToday ? now.getHours() * 60 + now.getMinutes() : 0;

  for (const window of windows) {
    const startMin = timeToMinutes(window.start);
    const endMin = timeToMinutes(window.end);
    for (let t = startMin; t + durationMinutes <= endMin; t += 15) {
      const startTime = minutesToTime(t);
      const endTime = minutesToTime(t + durationMinutes);
      const isPast = isToday && t < nowMin;
      const hasConflict =
        Boolean(date && therapistId && dayBookings) &&
        hasTherapistConflictAtSlot(
          dayBookings!,
          therapistId!,
          date!,
          startTime,
          durationMinutes,
          excludeBookingId,
        );

      slots.push({
        startTime,
        endTime,
        label: `${formatTimeInputValue(startTime)} – ${formatTimeInputValue(endTime)}`,
        available: !isPast && !hasConflict,
      });
    }
  }

  return slots;
}

export function computeAvailableSlots(input: {
  windows: AvailableWindow[];
  durationMinutes: number;
  date?: string;
  dayBookings?: Booking[];
  therapistId?: string;
  excludeBookingId?: string;
}): AvailableSlot[] {
  return computeScheduleSlots(input).filter((slot) => slot.available);
}

function getDoctorBookingBlocks(
  dayBookings: Booking[],
  doctorId: string,
  date: string,
  excludeBookingId?: string,
): MinuteWindow[] {
  return dayBookings
    .filter(
      (b) =>
        bookingOnLocalDate(b, date) &&
        ACTIVE_STATUSES.includes(b.status) &&
        b.doctorId === doctorId &&
        b.id !== excludeBookingId,
    )
    .map((b) => ({
      startMin: timeToMinutes(toTimeInputValue(b.startTime)),
      endMin: timeToMinutes(toTimeInputValue(b.endTime)),
    }));
}

function getHolidayMinuteBlocks(
  holidays: PublicHoliday[] | undefined,
  date: string,
): MinuteWindow[] {
  if (!holidays?.length) return [];
  const dayStart = startOfDay(parseDateInput(date));
  const dayEnd = endOfDay(parseDateInput(date));

  return holidays
    .filter((holiday) => {
      const start = new Date(holiday.startDateTime);
      const end = new Date(holiday.endDateTime);
      return start < dayEnd && end > dayStart;
    })
    .map((holiday) => {
      if (holiday.isFullDay) {
        return { startMin: 0, endMin: 24 * 60 };
      }
      const start = new Date(holiday.startDateTime);
      const end = new Date(holiday.endDateTime);
      const startMin = Math.max(0, Math.floor((start.getTime() - dayStart.getTime()) / 60000));
      const endMin = Math.min(24 * 60, Math.ceil((end.getTime() - dayStart.getTime()) / 60000));
      return { startMin, endMin };
    })
    .filter((block) => block.startMin < block.endMin);
}

function hasDoctorConflictAtSlot(
  dayBookings: Booking[],
  doctorId: string,
  date: string,
  startTime: string,
  durationMinutes: number,
  excludeBookingId?: string,
): boolean {
  const start = combineDateAndTime(parseDateInput(date), startTime);
  const end = computeEndTimeFromSlot(date, startTime, durationMinutes);
  return dayBookings.some(
    (b) =>
      b.id !== excludeBookingId &&
      bookingOnLocalDate(b, date) &&
      ACTIVE_STATUSES.includes(b.status) &&
      b.doctorId === doctorId &&
      rangesOverlap(start, end, new Date(b.startTime), new Date(b.endTime)),
  );
}

function hasRoomConflictAtSlot(
  dayBookings: Booking[],
  roomId: string,
  date: string,
  startTime: string,
  durationMinutes: number,
  excludeBookingId?: string,
): boolean {
  const start = combineDateAndTime(parseDateInput(date), startTime);
  const end = computeEndTimeFromSlot(date, startTime, durationMinutes);
  return dayBookings.some(
    (b) =>
      b.id !== excludeBookingId &&
      bookingOnLocalDate(b, date) &&
      ACTIVE_STATUSES.includes(b.status) &&
      b.roomId === roomId &&
      rangesOverlap(start, end, new Date(b.startTime), new Date(b.endTime)),
  );
}

export function computeConsultationAvailableWindows(input: {
  date: string;
  durationMinutes: number;
  doctor?: Doctor;
  dayBookings?: Booking[];
  holidays?: PublicHoliday[];
  excludeBookingId?: string;
}): AvailableWindow[] {
  if (!input.date || !input.durationMinutes || !input.doctor) return [];

  const consultStart = input.doctor.consultationStartTime ?? '08:00';
  const consultEnd = input.doctor.consultationEndTime ?? '18:00';
  let windows: MinuteWindow[] = [
    { startMin: timeToMinutes(consultStart), endMin: timeToMinutes(consultEnd) },
  ];

  const doctorBookings = getDoctorBookingBlocks(
    input.dayBookings ?? [],
    input.doctor.id,
    input.date,
    input.excludeBookingId,
  );
  const holidayBlocks = getHolidayMinuteBlocks(input.holidays, input.date);

  const free = subtractMinuteBlocks(
    subtractMinuteBlocks(windows, doctorBookings),
    holidayBlocks,
  );

  return free
    .filter((w) => w.endMin - w.startMin >= input.durationMinutes)
    .map((w) => ({ start: minutesToTime(w.startMin), end: minutesToTime(w.endMin) }));
}

export function computeConsultationAvailableSlots(input: {
  windows: AvailableWindow[];
  durationMinutes: number;
  date?: string;
  dayBookings?: Booking[];
  doctorId?: string;
  roomId?: string;
  stepMinutes?: number;
  excludeBookingId?: string;
}): AvailableSlot[] {
  const {
    windows,
    durationMinutes,
    date,
    dayBookings,
    doctorId,
    roomId,
    stepMinutes = 5,
    excludeBookingId,
  } = input;
  if (!durationMinutes || windows.length === 0) return [];

  const slots: AvailableSlot[] = [];
  const now = new Date();
  const isToday = date ? formatDateInput(now) === date : false;
  const nowMin = isToday ? now.getHours() * 60 + now.getMinutes() : 0;

  for (const window of windows) {
    const startMin = timeToMinutes(window.start);
    const endMin = timeToMinutes(window.end);
    for (let t = startMin; t + durationMinutes <= endMin; t += stepMinutes) {
      if (isToday && t < nowMin) continue;
      const startTime = minutesToTime(t);
      const endTime = minutesToTime(t + durationMinutes);

      if (
        date &&
        doctorId &&
        dayBookings &&
        hasDoctorConflictAtSlot(
          dayBookings,
          doctorId,
          date,
          startTime,
          durationMinutes,
          excludeBookingId,
        )
      ) {
        continue;
      }

      if (
        date &&
        roomId &&
        dayBookings &&
        hasRoomConflictAtSlot(
          dayBookings,
          roomId,
          date,
          startTime,
          durationMinutes,
          excludeBookingId,
        )
      ) {
        continue;
      }

      slots.push({
        startTime,
        endTime,
        label: `${formatTimeInputValue(startTime)} – ${formatTimeInputValue(endTime)}`,
      });
    }
  }

  return slots;
}

export function computeConsultationScheduleSlots(input: {
  windows: AvailableWindow[];
  durationMinutes: number;
  date?: string;
  dayBookings?: Booking[];
  doctorId?: string;
  roomId?: string;
  stepMinutes?: number;
  excludeBookingId?: string;
}): ScheduleSlot[] {
  const {
    windows,
    durationMinutes,
    date,
    dayBookings,
    doctorId,
    roomId,
    stepMinutes = 5,
    excludeBookingId,
  } = input;
  if (!durationMinutes || windows.length === 0) return [];

  const slots: ScheduleSlot[] = [];
  const now = new Date();
  const isToday = date ? formatDateInput(now) === date : false;
  const nowMin = isToday ? now.getHours() * 60 + now.getMinutes() : 0;

  for (const window of windows) {
    const startMin = timeToMinutes(window.start);
    const endMin = timeToMinutes(window.end);
    for (let t = startMin; t + durationMinutes <= endMin; t += stepMinutes) {
      const startTime = minutesToTime(t);
      const endTime = minutesToTime(t + durationMinutes);
      const isPast = isToday && t < nowMin;
      const hasDoctorConflict =
        Boolean(date && doctorId && dayBookings) &&
        hasDoctorConflictAtSlot(
          dayBookings!,
          doctorId!,
          date!,
          startTime,
          durationMinutes,
          excludeBookingId,
        );
      const hasRoomConflict =
        Boolean(date && roomId && dayBookings) &&
        hasRoomConflictAtSlot(
          dayBookings!,
          roomId!,
          date!,
          startTime,
          durationMinutes,
          excludeBookingId,
        );

      slots.push({
        startTime,
        endTime,
        label: `${formatTimeInputValue(startTime)} – ${formatTimeInputValue(endTime)}`,
        available: !isPast && !hasDoctorConflict && !hasRoomConflict,
      });
    }
  }

  return slots;
}

export function getConsultationAvailableRooms<T extends { id: string }>(
  rooms: T[],
  dayBookings: Booking[],
  date: string,
  startTime: string,
  durationMinutes: number,
  excludeBookingId?: string,
): T[] {
  if (!date || !startTime || !durationMinutes) return rooms;
  return rooms.filter(
    (room) =>
      !hasRoomConflictAtSlot(
        dayBookings,
        room.id,
        date,
        startTime,
        durationMinutes,
        excludeBookingId,
      ),
  );
}

export function computeAvailableStartTimes(
  windows: AvailableWindow[],
  durationMinutes: number,
  date?: string,
): string[] {
  return computeAvailableSlots({ windows, durationMinutes, date }).map((s) => s.startTime);
}

export function getAvailableRooms<T extends { id: string }>(
  rooms: T[],
  dayBookings: Booking[],
  date: string,
  startTime: string,
  durationMinutes: number,
  excludeBookingId?: string,
): T[] {
  if (!date || !startTime || !durationMinutes) return rooms;
  const start = combineDateAndTime(parseDateInput(date), startTime);
  const end = computeEndTimeFromSlot(date, startTime, durationMinutes);
  const activeBookings = dayBookings.filter(
    (b) => ACTIVE_STATUSES.includes(b.status) && bookingOnLocalDate(b, date),
  );

  return rooms.filter((room) => {
    const conflict = activeBookings.find(
      (b) =>
        b.id !== excludeBookingId &&
        b.roomId === room.id &&
        rangesOverlap(start, end, new Date(b.startTime), new Date(b.endTime)),
    );
    return !conflict;
  });
}

export function isScheduleConstraintIssue(issue: SlotValidationIssue): boolean {
  return issue.code === 'consultation_hours' || issue.code === 'availability';
}

export function hasBlockingSlotIssues(
  issues: SlotValidationIssue[],
  options?: SlotValidationOptions,
): boolean {
  return issues.some((issue) => {
    if (issue.type !== 'error') return false;
    if (options?.overrideScheduleConstraints && isScheduleConstraintIssue(issue)) return false;
    return true;
  });
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

export function validateBookingSlot(
  input: SlotValidationInput,
  options?: SlotValidationOptions,
): SlotValidationIssue[] {
  const issues: SlotValidationIssue[] = [];

  if (!input.date || !input.startTime || !input.durationMinutes) {
    return issues;
  }

  const start = combineDateAndTime(parseDateInput(input.date), input.startTime);
  const end = computeEndTimeFromSlot(input.date, input.startTime, input.durationMinutes);
  const now = new Date();

  if (!options?.skipPastValidation && start < now) {
    issues.push({ type: 'error', code: 'past', message: 'Cannot schedule bookings in the past' });
  }

  if (start >= end) {
    issues.push({ type: 'error', code: 'duration', message: 'Invalid booking duration' });
  }

  const slotStart = input.startTime;
  const slotEnd = toTimeInputValue(end);

  if (
    !options?.overrideScheduleConstraints &&
    input.therapist?.requiresConsultationHours !== false &&
    input.therapist?.consultationStartTime &&
    input.therapist?.consultationEndTime
  ) {
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
        code: 'consultation_hours',
        message: `Outside consultation hours (${input.therapist.consultationStartTime}–${input.therapist.consultationEndTime})`,
      });
    }
  }

  if (!options?.overrideScheduleConstraints && input.availability && input.availability.length > 0) {
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
          code: 'availability',
          message: 'Booking falls outside therapist availability',
        });
      }
    }
  }

  const activeBookings = (input.dayBookings ?? []).filter(
    (b) => ACTIVE_STATUSES.includes(b.status) && bookingOnLocalDate(b, input.date),
  );

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
      code: 'therapist_conflict',
      message: `Therapist already booked ${formatTime(therapistConflict.startTime)}–${formatTime(therapistConflict.endTime)} with ${getPatientName(therapistConflict.patient)} (${roomName})`,
    });
  }

  if (input.roomId) {
    const roomConflict = activeBookings.find(
      (b) =>
        b.id !== input.excludeBookingId &&
        b.roomId === input.roomId &&
        rangesOverlap(start, end, new Date(b.startTime), new Date(b.endTime)),
    );
    if (roomConflict) {
      issues.push({
        type: 'error',
        code: 'room_conflict',
        message: `Room already booked ${formatTime(roomConflict.startTime)}–${formatTime(roomConflict.endTime)} with ${getPatientName(roomConflict.patient)} (${roomConflict.therapist ? getTherapistName(roomConflict.therapist) : 'staff'})`,
      });
    }
  }

  const leaveBlocks = getLeaveMinuteBlocks(input.approvedLeaves, input.date);
  const slotStartMin = timeToMinutes(slotStart);
  const slotEndMin = timeToMinutes(slotEnd);
  const leaveConflict = leaveBlocks.some(
    (block) => slotStartMin < block.endMin && slotEndMin > block.startMin,
  );
  if (leaveConflict) {
    issues.push({
      type: 'error',
      code: 'leave',
      message: 'Therapist has approved leave during this time slot',
    });
  }

  if (options?.overrideScheduleConstraints) {
    return issues.filter((issue) => !isScheduleConstraintIssue(issue));
  }

  return issues;
}

export function buildSlotOccupancyPreview(input: SlotValidationInput): SlotOccupancyItem[] {
  if (!input.date || !input.startTime || !input.durationMinutes || !input.therapistId || !input.roomId) {
    return [];
  }

  const start = combineDateAndTime(parseDateInput(input.date), input.startTime);
  const end = computeEndTimeFromSlot(input.date, input.startTime, input.durationMinutes);
  const activeBookings = (input.dayBookings ?? []).filter(
    (b) => ACTIVE_STATUSES.includes(b.status) && bookingOnLocalDate(b, input.date),
  );

  const items: SlotOccupancyItem[] = activeBookings
    .filter(
      (b) =>
        b.id !== input.excludeBookingId &&
        (b.therapistId === input.therapistId || b.roomId === input.roomId),
    )
    .map((b) => ({
      id: b.id,
      label: `${getPatientName(b.patient)} · ${b.therapist ? getTherapistName(b.therapist) : 'Consultation'}`,
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
