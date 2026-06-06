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
import { canEditBooking } from '@/lib/appointment-list-utils';
import {
  cn,
  formatTime,
  getBookingStaffColor,
  getDoctorName,
  getPatientName,
  getTherapistName,
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

export function getBookingPosition(booking: Booking) {
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const dayStartMinutes = DAY_START_HOUR * 60;
  const top = ((startMinutes - dayStartMinutes) / SLOT_MINUTES) * SLOT_HEIGHT;
  const height = Math.max(((endMinutes - startMinutes) / SLOT_MINUTES) * SLOT_HEIGHT, SLOT_HEIGHT);
  return { top, height };
}

interface BookingCardProps {
  booking: Booking;
  onSelect: (booking: Booking) => void;
  compact?: boolean;
  variant?: 'timeline' | 'list';
  showActionsMenu?: boolean;
  onEdit?: (booking: Booking) => void;
  onPostpone?: (booking: Booking) => void;
  onCancel?: (booking: Booking) => void;
}

export function BookingCard({
  booking,
  onSelect,
  compact = false,
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
  const staffName = isConsultation
    ? booking.doctor
      ? getDoctorName(booking.doctor)
      : 'Doctor'
    : booking.therapist
      ? getTherapistName(booking.therapist)
      : 'Therapist';

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-md border-l-4 bg-white text-left shadow-sm transition hover:shadow-md',
        variant === 'timeline' && 'absolute left-1 right-1 h-full p-2',
        variant === 'list' && 'w-full p-3',
        isInactive && 'opacity-60',
        compact && variant === 'timeline' && 'p-1.5',
      )}
      style={{ borderLeftColor: color }}
    >
      <button
        type="button"
        onClick={() => onSelect(booking)}
        className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-ring"
      >
      <div className="flex items-start justify-between gap-1">
        <p className={cn('truncate font-semibold text-slate-900', compact ? 'text-xs' : 'text-sm')}>
          {getPatientName(booking.patient)}
        </p>
        <BookingStatusBadge status={booking.status} />
      </div>
      <p className={cn('truncate text-slate-600', compact ? 'text-[10px]' : 'text-xs')}>
        {isConsultation ? 'Consultation' : (booking.therapy?.name ?? 'Therapy')}
      </p>
      <p className={cn('truncate text-slate-500', compact ? 'text-[10px]' : 'text-xs')}>
        {staffName}
      </p>
      <div className={cn('mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-slate-500', compact ? 'text-[10px]' : 'text-xs')}>
        <span>
          {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
        </span>
        <span className="hidden sm:inline">·</span>
        <span>{booking.durationMinutes} min</span>
        <span className="hidden sm:inline">·</span>
        <span className="truncate">{booking.room.name}</span>
      </div>
      </button>

      {editable && (
        <div className="absolute right-1 top-1 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-6 w-6 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                onClick={(e) => e.stopPropagation()}
                aria-label="Appointment actions"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onSelect(booking)}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(booking)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onPostpone && (
                <DropdownMenuItem onClick={() => onPostpone(booking)}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Postpone
                </DropdownMenuItem>
              )}
              {onCancel && (
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
