'use client';

import { BookingStatusBadge } from '@/components/booking/booking-status-badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Booking } from '@/lib/types';
import {
  canEditBooking,
  canRestoreBooking,
  formatDateTime,
  formatUserName,
  getAppointmentCardBorderClass,
} from '@/lib/appointment-list-utils';
import { formatTime, getPatientName, getTherapistName } from '@/lib/utils';
import {
  Calendar,
  Clock,
  DoorOpen,
  Eye,
  MoreVertical,
  Pencil,
  Phone,
  RotateCcw,
  Stethoscope,
  Timer,
  User,
  XCircle,
} from 'lucide-react';

interface AppointmentListCardProps {
  booking: Booking;
  onView: (booking: Booking) => void;
  onEdit?: (booking: Booking) => void;
  onPostpone?: (booking: Booking) => void;
  onCancel?: (booking: Booking) => void;
  onRestore?: (booking: Booking) => void;
}

export function AppointmentListCard({
  booking,
  onView,
  onEdit,
  onPostpone,
  onCancel,
  onRestore,
}: AppointmentListCardProps) {
  const insuranceName = booking.patientInsurance?.insuranceProvider?.name;
  const editable = canEditBooking(booking);
  const restorable = canRestoreBooking(booking);
  const appointmentDate = new Date(booking.startTime).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <article
      className={`rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md ${getAppointmentCardBorderClass(booking)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-slate-900">
              {getPatientName(booking.patient)}
            </h3>
            <BookingStatusBadge status={booking.status} />
          </div>
          {booking.patient.phone && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {booking.patient.phone}
            </p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Actions">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onView(booking)}>
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
            {editable && onCancel && (
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
            {restorable && onRestore && (
              <DropdownMenuItem onClick={() => onRestore(booking)}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Restore
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InfoItem icon={Stethoscope} label="Therapy" value={booking.therapy.name} />
        <InfoItem icon={User} label="Therapist" value={getTherapistName(booking.therapist)} />
        <InfoItem icon={DoorOpen} label="Room" value={booking.room.name} />
        <InfoItem icon={Calendar} label="Date" value={appointmentDate} />
        <InfoItem
          icon={Clock}
          label="Time"
          value={`${formatTime(booking.startTime)} – ${formatTime(booking.endTime)}`}
        />
        <InfoItem icon={Timer} label="Duration" value={`${booking.durationMinutes} min`} />
        {insuranceName && (
          <InfoItem icon={Stethoscope} label="Insurance" value={insuranceName} className="sm:col-span-2" />
        )}
      </div>

      {booking.cancellationReason && (
        <div className="mt-3 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">
          <span className="font-medium">Cancellation reason: </span>
          {booking.cancellationReason}
        </div>
      )}

      <div className="mt-4 grid gap-1 border-t pt-3 text-xs text-muted-foreground sm:grid-cols-2">
        <span>Created by {formatUserName(booking.createdBy)} · {formatDateTime(booking.createdAt)}</span>
        {booking.updatedBy && (
          <span>Modified by {formatUserName(booking.updatedBy)} · {formatDateTime(booking.updatedAt)}</span>
        )}
        {booking.cancelledBy && (
          <span>Cancelled by {formatUserName(booking.cancelledBy)} · {formatDateTime(booking.cancelledAt)}</span>
        )}
        {booking.rescheduledBy && (
          <span>Rescheduled by {formatUserName(booking.rescheduledBy)} · {formatDateTime(booking.rescheduledAt)}</span>
        )}
      </div>
    </article>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}
