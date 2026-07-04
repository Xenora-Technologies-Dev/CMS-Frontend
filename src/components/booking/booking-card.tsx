'use client';

import { BookingStatusBadge } from './booking-status-badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Booking } from '@/lib/types';
import { canCancelBooking, canEditBooking } from '@/lib/appointment-list-utils';
import {
  cn,
  formatTime,
  getBookingStaffColor,
  getDoctorName,
  getPatientName,
  getTherapistName,
  hexToRgba,
} from '@/lib/utils';
import { Calendar, Eye, MoreVertical, Pencil, XCircle } from 'lucide-react';

import {
  CALENDAR_DAY_END_HOUR,
  CALENDAR_DAY_START_HOUR,
  CALENDAR_SLOT_HEIGHT,
  CALENDAR_SLOT_MINUTES,
} from '@/components/booking/booking-constants';

export const SLOT_HEIGHT = CALENDAR_SLOT_HEIGHT;
export const DAY_START_HOUR = CALENDAR_DAY_START_HOUR;
export const DAY_END_HOUR = CALENDAR_DAY_END_HOUR;
export const SLOT_MINUTES = CALENDAR_SLOT_MINUTES;

/** Progressive detail levels — taller blocks show more (Teams-style). */
type EventDensity = 'xs' | 'sm' | 'md' | 'lg';

function getEventDensity(eventHeightPx: number): EventDensity {
  const slots = eventHeightPx / CALENDAR_SLOT_HEIGHT;
  if (slots < 1.25) return 'xs';
  if (slots < 1.75) return 'sm';
  if (slots < 2) return 'md';
  return 'lg';
}

export function getBookingPosition(booking: Booking) {
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const dayStartMinutes = DAY_START_HOUR * 60;
  const top = Math.round(((startMinutes - dayStartMinutes) / SLOT_MINUTES) * SLOT_HEIGHT);
  const height = Math.round(
    Math.max(((endMinutes - startMinutes) / SLOT_MINUTES) * SLOT_HEIGHT, SLOT_HEIGHT),
  );
  return { top, height };
}

interface BookingCardProps {
  booking: Booking;
  onSelect: (booking: Booking) => void;
  /** Pixel height of the calendar event block (timeline only). */
  eventHeight?: number;
  variant?: 'timeline' | 'list';
  showActionsMenu?: boolean;
  onEdit?: (booking: Booking) => void;
  onPostpone?: (booking: Booking) => void;
  onCancel?: (booking: Booking) => void;
}

export function BookingCard({
  booking,
  onSelect,
  eventHeight,
  variant = 'timeline',
  showActionsMenu = false,
  onEdit,
  onPostpone,
  onCancel,
}: BookingCardProps) {
  const color = getBookingStaffColor(booking);
  const isConsultation = booking.bookingType === 'CONSULTATION';
  const isInactive = ['CANCELLED', 'RESCHEDULED', 'COMPLETED', 'NO_SHOW'].includes(booking.status);
  const editable = showActionsMenu && canEditBooking(booking);
  const cancellable = showActionsMenu && canCancelBooking(booking) && onCancel;
  const showActions = editable || cancellable;
  const staffName = isConsultation
    ? booking.doctor
      ? getDoctorName(booking.doctor)
      : 'Doctor'
    : booking.therapist
      ? getTherapistName(booking.therapist)
      : 'Therapist';

  const isTimeline = variant === 'timeline';
  const density: EventDensity = isTimeline && eventHeight ? getEventDensity(eventHeight) : 'lg';
  const showStaff = density !== 'xs';
  const showTherapy = density === 'md' || density === 'lg';
  const showTimeRow = density === 'lg';

  const patientLines = density === 'xs' ? 1 : density === 'sm' ? 2 : undefined;
  const nameClass = cn(
    'break-words font-bold leading-snug',
    isTimeline ? 'text-xs sm:text-sm' : 'text-sm',
  );

  return (
    <div
      className={cn(
        'group relative text-left transition',
        isTimeline &&
          'absolute inset-x-0.5 top-0 h-full flex flex-col overflow-hidden rounded-sm border-l-[3px] px-1.5 py-0.5 sm:px-2 sm:py-1',
        variant === 'list' && 'w-full overflow-hidden rounded-md border-l-4 p-3 shadow-sm',
        isInactive && 'opacity-60',
        !isTimeline && 'shadow-sm hover:shadow-md',
      )}
      style={{
        borderLeftColor: color,
        backgroundColor: hexToRgba(color, isInactive ? 0.2 : 0.35),
      }}
    >
      <button
        type="button"
        onClick={() => onSelect(booking)}
        className={cn(
          'flex min-h-0 w-full min-w-0 flex-1 flex-col gap-0.5 text-left focus:outline-none focus:ring-2 focus:ring-ring',
          showActions && 'pr-5 sm:pr-6',
        )}
      >
        <BookingStatusBadge status={booking.status} compact={isTimeline} />

        <p
          className={cn(
            nameClass,
            'text-slate-900',
            patientLines === 1 && 'line-clamp-1',
            patientLines === 2 && 'line-clamp-2',
          )}
        >
          {getPatientName(booking.patient)}
        </p>

        {showTherapy && (
          <p
            className={cn(
              'line-clamp-2 break-words leading-snug text-slate-700',
              isTimeline ? 'text-[10px] sm:text-xs' : 'text-xs',
            )}
          >
            {isConsultation ? 'Consultation' : (booking.therapy?.name ?? 'Therapy')}
          </p>
        )}

        {showStaff && (
          <p className={cn(nameClass, 'text-slate-800', patientLines === 1 && 'line-clamp-1')}>
            {staffName}
          </p>
        )}

        {showTimeRow && (
          <p
            className={cn(
              'mt-auto line-clamp-2 leading-tight text-slate-600',
              isTimeline ? 'text-[10px] sm:text-[11px]' : 'text-xs',
            )}
          >
            {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
            <span className="mx-1" aria-hidden="true">
              ·
            </span>
            {booking.durationMinutes} min
            <span className="mx-1" aria-hidden="true">
              ·
            </span>
            {booking.room.name}
          </p>
        )}
      </button>

      {showActions && (
        <div className="absolute right-0.5 top-0.5 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-5 w-5 opacity-0 shadow-none transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100 sm:h-6 sm:w-6"
                onClick={(e) => e.stopPropagation()}
                aria-label="Appointment actions"
              >
                <MoreVertical className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onSelect(booking)}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              {editable && onEdit && (
                <DropdownMenuItem onClick={() => onEdit(booking)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {editable && onPostpone && (
                <DropdownMenuItem onClick={() => onPostpone(booking)}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Postpone
                </DropdownMenuItem>
              )}
              {cancellable && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onCancel(booking)}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

interface BookingCardListProps {
  bookings: Booking[];
  onSelect: (booking: Booking) => void;
}

export function BookingCardList({ bookings, onSelect }: BookingCardListProps) {
  const sorted = [...bookings].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No bookings for this day
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((booking) => (
        <BookingCard key={booking.id} booking={booking} onSelect={onSelect} variant="list" />
      ))}
    </div>
  );
}
