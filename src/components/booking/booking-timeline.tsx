'use client';

import {
  CALENDAR_SLOT_HEIGHT,
  CALENDAR_SLOT_MINUTES,
  CALENDAR_SLOTS_PER_HOUR,
  computeCalendarDayRange,
} from '@/components/booking/booking-constants';
import { BookingCard, getBookingPosition } from '@/components/booking/booking-card';
import type { Booking, PublicHoliday, Room } from '@/lib/types';
import {
  cn,
  combineDateAndTime,
  formatTimeInputValue,
  generateTimeSlots,
  getBookingStaffColor,
  hexToRgba,
} from '@/lib/utils';
import { Plus } from 'lucide-react';
import { useCallback, useMemo, useRef } from 'react';

interface BookingTimelineProps {
  rooms: Room[];
  bookings: Booking[];
  selectedDate: Date;
  holidays?: PublicHoliday[];
  onSelectBooking: (booking: Booking) => void;
  onEmptySlotClick?: (roomId: string, time: string) => void;
  showBookingActions?: boolean;
  onEditBooking?: (booking: Booking) => void;
  onPostponeBooking?: (booking: Booking) => void;
  onCancelBooking?: (booking: Booking) => void;
}

function slotOverlapsBooking(slot: string, booking: Booking, selectedDate: Date): boolean {
  const slotStart = combineDateAndTime(selectedDate, slot);
  const slotEnd = new Date(slotStart);
  slotEnd.setMinutes(slotEnd.getMinutes() + CALENDAR_SLOT_MINUTES);
  const bookingStart = new Date(booking.startTime);
  const bookingEnd = new Date(booking.endTime);
  return bookingStart < slotEnd && bookingEnd > slotStart;
}

function getSlotFillColor(
  roomId: string,
  slot: string,
  bookings: Booking[],
  selectedDate: Date,
): string | undefined {
  const covering = bookings.find(
    (b) => b.roomId === roomId && slotOverlapsBooking(slot, b, selectedDate),
  );
  if (!covering) return undefined;
  return hexToRgba(getBookingStaffColor(covering), 0.18);
}

function isHourBoundary(slot: string): boolean {
  const minutes = Number(slot.split(':')[1]);
  return minutes === 0;
}

export function BookingTimeline({
  rooms,
  bookings,
  selectedDate,
  holidays = [],
  onSelectBooking,
  onEmptySlotClick,
  showBookingActions = false,
  onEditBooking,
  onPostponeBooking,
  onCancelBooking,
}: BookingTimelineProps) {
  const { startHour, endHour } = useMemo(
    () => computeCalendarDayRange(bookings, selectedDate),
    [bookings, selectedDate],
  );

  const timeSlots = useMemo(
    () => generateTimeSlots(startHour, endHour, CALENDAR_SLOT_MINUTES),
    [startHour, endHour],
  );
  const timelineHeight = timeSlots.length * CALENDAR_SLOT_HEIGHT;

  const bookingsByRoom = useMemo(
    () =>
      rooms.reduce<Record<string, Booking[]>>((acc, room) => {
        acc[room.id] = bookings.filter((b) => b.roomId === room.id);
        return acc;
      }, {}),
    [rooms, bookings],
  );

  const nowIndicatorTop = useMemo(() => {
    const today = new Date();
    if (
      today.getFullYear() !== selectedDate.getFullYear() ||
      today.getMonth() !== selectedDate.getMonth() ||
      today.getDate() !== selectedDate.getDate()
    ) {
      return null;
    }
    const minutes = today.getHours() * 60 + today.getMinutes();
    const dayStart = startHour * 60;
    const dayEnd = endHour * 60;
    if (minutes < dayStart || minutes > dayEnd) return null;
    return Math.round(((minutes - dayStart) / CALENDAR_SLOT_MINUTES) * CALENDAR_SLOT_HEIGHT);
  }, [selectedDate, startHour, endHour]);

  const isToday = new Date().toDateString() === selectedDate.toDateString();

  const dayHolidays = useMemo(() => {
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);
    return holidays.filter((h) => {
      const start = new Date(h.startDateTime);
      const end = new Date(h.endDateTime);
      return start <= dayEnd && end >= dayStart;
    });
  }, [holidays, selectedDate]);

  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  const syncHeaderScroll = useCallback(() => {
    const body = bodyScrollRef.current;
    const header = headerScrollRef.current;
    if (body && header && header.scrollLeft !== body.scrollLeft) {
      header.scrollLeft = body.scrollLeft;
    }
  }, []);

  const roomColumnClass =
    'relative shrink-0 border-r last:border-r-0 min-w-[clamp(130px,36vw,200px)] flex-[1_0_clamp(130px,36vw,200px)]';

  return (
    <div className="flex max-h-[min(75vh,calc(100vh-14rem))] flex-col overflow-hidden rounded-lg border bg-white shadow-sm">
      {dayHolidays.length > 0 && (
        <div className="shrink-0 border-b bg-amber-50 px-4 py-2 text-xs text-amber-900">
          <span className="font-semibold">Public holiday{dayHolidays.length > 1 ? 's' : ''}: </span>
          {dayHolidays.map((h) => h.name).join(', ')}
        </div>
      )}

      <div
        ref={headerScrollRef}
        className="shrink-0 overflow-x-auto border-b bg-slate-50/95 shadow-sm backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="inline-flex min-w-full">
          <div className="flex h-12 w-14 shrink-0 items-center border-r px-1">
            <span className="text-[10px] font-semibold uppercase text-slate-700">Time</span>
          </div>
          {rooms.map((room) => (
            <div key={room.id} className={roomColumnClass}>
              <div className="flex h-12 flex-col justify-center px-2">
                <p className="truncate text-sm font-bold text-slate-900">{room.name}</p>
                {room.code && (
                  <p className="truncate text-[10px] font-medium text-slate-600">{room.code}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        ref={bodyScrollRef}
        className="min-h-0 flex-1 overflow-auto"
        onScroll={syncHeaderScroll}
      >
        <div className="inline-flex min-w-full">
          <div className="sticky left-0 z-40 w-14 shrink-0 border-r bg-slate-50/95 backdrop-blur-md">
            <div className="relative" style={{ height: timelineHeight }}>
              {timeSlots.map((slot, index) => {
                const hourMark = isHourBoundary(slot);
                return (
                  <div
                    key={slot}
                    className={cn(
                      'absolute left-0 right-0',
                      hourMark && 'border-t border-slate-200',
                    )}
                    style={{ top: index * CALENDAR_SLOT_HEIGHT, height: CALENDAR_SLOT_HEIGHT }}
                  >
                    <span
                      className={cn(
                        'absolute left-0.5 top-0 z-10 -translate-y-1/2 bg-slate-50/95 px-0.5 leading-none',
                        hourMark
                          ? 'text-[10px] font-bold text-slate-800'
                          : 'text-[8px] font-normal text-muted-foreground',
                      )}
                    >
                      {formatTimeInputValue(slot)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {rooms.map((room) => (
            <div key={room.id} className={roomColumnClass}>
              <div className="relative bg-slate-50/20" style={{ height: timelineHeight }}>
                {timeSlots.map((slot, index) => {
                  const fillColor = getSlotFillColor(room.id, slot, bookings, selectedDate);
                  const hourMark = isHourBoundary(slot);
                  return (
                    <button
                      key={`${room.id}-${slot}`}
                      type="button"
                      className={cn(
                        'absolute left-0 right-0 transition-colors',
                        'hover:bg-primary/5 focus-visible:bg-primary/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary',
                        hourMark && 'border-t border-slate-200',
                        onEmptySlotClick && 'group cursor-pointer',
                      )}
                      style={{
                        top: index * CALENDAR_SLOT_HEIGHT,
                        height: CALENDAR_SLOT_HEIGHT,
                        backgroundColor: fillColor,
                      }}
                      onClick={() => onEmptySlotClick?.(room.id, slot)}
                      aria-label={`Book ${room.name} at ${formatTimeInputValue(slot)}`}
                    >
                      {onEmptySlotClick && index % CALENDAR_SLOTS_PER_HOUR === 0 && (
                        <Plus className="mx-auto hidden h-3 w-3 text-primary/40 group-hover:block" />
                      )}
                    </button>
                  );
                })}

                {isToday && nowIndicatorTop !== null && (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-red-500"
                    style={{ top: nowIndicatorTop }}
                  >
                    <span className="absolute -left-1 -top-2 rounded bg-red-500 px-1 text-[9px] font-bold text-white">
                      Now
                    </span>
                  </div>
                )}

                {bookingsByRoom[room.id]?.map((booking) => {
                  const { top, height } = getBookingPosition(booking, startHour);
                  return (
                    <div
                      key={booking.id}
                      className="pointer-events-none absolute left-0 right-0 z-[5]"
                      style={{ top, height }}
                    >
                      <div className="pointer-events-auto relative h-full">
                        <BookingCard
                          booking={booking}
                          onSelect={onSelectBooking}
                          eventHeight={height}
                          showActionsMenu={showBookingActions}
                          onEdit={onEditBooking}
                          onPostpone={onPostponeBooking}
                          onCancel={onCancelBooking}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
