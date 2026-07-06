import type { Booking } from '@/lib/types';

/** Default visible calendar range: 6:00 AM – 12:00 AM (midnight). */
export const CALENDAR_DEFAULT_DAY_START_HOUR = 6;
export const CALENDAR_DEFAULT_DAY_END_HOUR = 24;
export const CALENDAR_SLOT_MINUTES = 5;
/** ~16px per 5 min keeps the 6am–midnight range scrollable without excessive height. */
export const CALENDAR_SLOT_HEIGHT = 16;
export const CALENDAR_MIN_ROOM_COLUMN_WIDTH = 160;

/** Slots per hour at the current interval. */
export const CALENDAR_SLOTS_PER_HOUR = 60 / CALENDAR_SLOT_MINUTES;

/** Password required to edit or cancel completed bookings. */
export const COMPLETED_BOOKING_PASSWORD = '12345';

/**
 * Compute the visible hour range for a calendar day.
 * Defaults to 6am–midnight; expands if bookings fall outside that window.
 */
export function computeCalendarDayRange(
  bookings: Booking[],
  selectedDate: Date,
): { startHour: number; endHour: number } {
  let startHour = CALENDAR_DEFAULT_DAY_START_HOUR;
  let endHour = CALENDAR_DEFAULT_DAY_END_HOUR;

  const dayKey = selectedDate.toDateString();

  for (const booking of bookings) {
    const bookingStart = new Date(booking.startTime);
    const bookingEnd = new Date(booking.endTime);

    const startsOnDay = bookingStart.toDateString() === dayKey;
    const endsOnDay = bookingEnd.toDateString() === dayKey;
    if (!startsOnDay && !endsOnDay) continue;

    if (startsOnDay) {
      const startMinutes = bookingStart.getHours() * 60 + bookingStart.getMinutes();
      const bookingStartHour = Math.floor(startMinutes / 60);
      if (bookingStartHour < startHour) startHour = bookingStartHour;
    }

    if (endsOnDay) {
      const endMinutes = bookingEnd.getHours() * 60 + bookingEnd.getMinutes();
      const bookingEndHour =
        endMinutes % 60 === 0 && endMinutes > 0
          ? endMinutes / 60
          : Math.ceil(endMinutes / 60);
      if (bookingEndHour > endHour) endHour = bookingEndHour;
    } else if (startsOnDay) {
      // Booking spans past midnight into the next day
      endHour = Math.max(endHour, 24);
    }
  }

  return {
    startHour,
    endHour: Math.max(endHour, startHour + 1),
  };
}
