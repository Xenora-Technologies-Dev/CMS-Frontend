'use client';

import type { Room, Therapist, Therapy } from '@/lib/types';
import { formatTime, formatTimeInputValue, getPatientName, getTherapistName } from '@/lib/utils';
import { BookingStatusBadge } from '@/components/booking/booking-status-badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, DoorOpen, Stethoscope, User } from 'lucide-react';

interface BookingSummaryProps {
  patientName: string;
  therapist: Therapist;
  therapy: Therapy;
  room: Room;
  date: string;
  startTime: string;
  endTime: Date;
}

export function BookingSummary({
  patientName,
  therapist,
  therapy,
  room,
  date,
  startTime,
  endTime,
}: BookingSummaryProps) {
  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const items = [
    { icon: User, label: 'Patient', value: patientName },
    { icon: Stethoscope, label: 'Therapist', value: getTherapistName(therapist) },
    { icon: Stethoscope, label: 'Therapy', value: `${therapy.name} (${therapy.durationMinutes} min)` },
    { icon: DoorOpen, label: 'Room', value: room.name },
    { icon: Calendar, label: 'Date', value: formattedDate },
    {
      icon: Clock,
      label: 'Time',
      value: `${formatTimeInputValue(startTime)} – ${formatTime(endTime)}`,
    },
  ];

  return (
    <div className="space-y-4 rounded-lg border bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Booking Summary</h3>
        <BookingStatusBadge status="SCHEDULED" />
      </div>
      <Separator />
      <dl className="space-y-3">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-sm font-medium text-slate-900">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">
        Review the details above before confirming the booking.
      </p>
    </div>
  );
}

interface BookingSummaryFromPatientProps extends Omit<BookingSummaryProps, 'patientName'> {
  patient: { firstName: string; lastName: string };
}

export function BookingSummaryFromPatient({
  patient,
  ...rest
}: BookingSummaryFromPatientProps) {
  return <BookingSummary patientName={getPatientName(patient)} {...rest} />;
}
