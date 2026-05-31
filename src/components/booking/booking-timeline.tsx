'use client';

import {
  CALENDAR_DAY_END_HOUR,
  CALENDAR_DAY_START_HOUR,
  CALENDAR_MIN_ROOM_COLUMN_WIDTH,
  CALENDAR_SLOT_HEIGHT,
  CALENDAR_SLOT_MINUTES,
} from '@/components/booking/booking-constants';
import { BookingCard } from '@/components/booking/booking-card';
import type { Booking, Room } from '@/lib/types';
import { cn, generateTimeSlots } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';

interface BookingTimelineProps {
  rooms: Room[];
  bookings: Booking[];
  selectedDate: Date;
  onSelectBooking: (booking: Booking) => void;
  onEmptySlotClick?: (roomId: string, time: string) => void;
  showBookingActions?: boolean;
  onEditBooking?: (booking: Booking) => void;
  onPostponeBooking?: (booking: Booking) => void;
  onCancelBooking?: (booking: Booking) => void;
}

function getBookingPosition(booking: Booking) {
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const dayStartMinutes = CALENDAR_DAY_START_HOUR * 60;
  const top =
    ((startMinutes - dayStartMinutes) / CALENDAR_SLOT_MINUTES) * CALENDAR_SLOT_HEIGHT;
  const height = Math.max(
    ((endMinutes - startMinutes) / CALENDAR_SLOT_MINUTES) * CALENDAR_SLOT_HEIGHT,
    CALENDAR_SLOT_HEIGHT,
  );
  return { top, height };
}

export function BookingTimeline({
  rooms,
  bookings,
  selectedDate,
  onSelectBooking,
  onEmptySlotClick,
  showBookingActions = false,
  onEditBooking,
  onPostponeBooking,
  onCancelBooking,
}: BookingTimelineProps) {
  const timeSlots = generateTimeSlots(
    CALENDAR_DAY_START_HOUR,
    CALENDAR_DAY_END_HOUR,
    CALENDAR_SLOT_MINUTES,
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
    const dayStart = CALENDAR_DAY_START_HOUR * 60;
    const dayEnd = CALENDAR_DAY_END_HOUR * 60;
    if (minutes < dayStart || minutes > dayEnd) return null;
    return ((minutes - dayStart) / CALENDAR_SLOT_MINUTES) * CALENDAR_SLOT_HEIGHT;
  }, [selectedDate]);

  const isToday =
    new Date().toDateString() === selectedDate.toDateString();

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="hidden md:block">
        <ScrollArea className="w-full">
          <div className="inline-flex min-w-full">
            <div className="sticky left-0 z-30 w-14 shrink-0 border-r bg-slate-50">
              <div className="sticky top-0 z-20 flex h-12 items-center border-b bg-slate-50 px-1">
                <span className="text-[10px] font-medium uppercase text-muted-foreground">
                  Time
                </span>
              </div>
              <div className="relative" style={{ height: timelineHeight }}>
                {timeSlots.map((slot, index) => (
                  <div
                    key={slot}
                    className={cn(
                      'absolute left-0 right-0 border-b border-slate-100',
                      index % 4 === 0 && 'border-slate-200',
                    )}
                    style={{ top: index * CALENDAR_SLOT_HEIGHT, height: CALENDAR_SLOT_HEIGHT }}
                  >
                    {index % 4 === 0 && (
                      <span className="absolute -top-2 left-0.5 bg-slate-50 px-0.5 text-[10px] font-medium text-muted-foreground">
                        {slot}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {rooms.map((room) => (
              <div
                key={room.id}
                className="relative shrink-0 border-r last:border-r-0"
                style={{
                  minWidth: CALENDAR_MIN_ROOM_COLUMN_WIDTH,
                  flex: `1 0 ${CALENDAR_MIN_ROOM_COLUMN_WIDTH}px`,
                }}
              >
                <div className="sticky top-0 z-20 flex h-12 flex-col justify-center border-b bg-slate-50 px-2">
                  <p className="truncate text-sm font-semibold">{room.name}</p>
                  {room.code && (
                    <p className="truncate text-[10px] text-muted-foreground">{room.code}</p>
                  )}
                </div>

                <div className="relative bg-slate-50/20" style={{ height: timelineHeight }}>
                  {timeSlots.map((slot, index) => (
                    <button
                      key={`${room.id}-${slot}`}
                      type="button"
                      className={cn(
                        'absolute left-0 right-0 border-b border-slate-100 transition-colors',
                        'hover:bg-primary/5 focus-visible:bg-primary/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary',
                        index % 4 === 0 && 'border-slate-200',
                        onEmptySlotClick && 'group cursor-pointer',
                      )}
                      style={{
                        top: index * CALENDAR_SLOT_HEIGHT,
                        height: CALENDAR_SLOT_HEIGHT,
                      }}
                      onClick={() => onEmptySlotClick?.(room.id, slot)}
                      aria-label={`Book ${room.name} at ${slot}`}
                    >
                      {onEmptySlotClick && index % 2 === 0 && (
                        <Plus className="mx-auto hidden h-3 w-3 text-primary/40 group-hover:block" />
                      )}
                    </button>
                  ))}

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
                    const { top, height } = getBookingPosition(booking);
                    return (
                      <div
                        key={booking.id}
                        className="pointer-events-none absolute left-0 right-0 z-[5]"
                        style={{ top, height }}
                      >
                        <div className="pointer-events-auto h-full">
                          <BookingCard
                            booking={booking}
                            onSelect={onSelectBooking}
                            compact={height < CALENDAR_SLOT_HEIGHT * 2}
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
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <p className="border-t px-3 py-2 text-center text-[10px] text-muted-foreground md:hidden">
        Use the list below on small screens, or rotate for the room grid view.
      </p>
    </div>
  );
}
