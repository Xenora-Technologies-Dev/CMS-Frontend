import type { Booking } from '@/lib/types';
import { formatTime, getPatientName, getTherapistColor, getTherapistName } from '@/lib/utils';
import { BookingStatusBadge } from '@/components/booking/booking-status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface TodayScheduleProps {
  bookings: Booking[];
  calendarHref?: string;
}

export function TodaySchedule({ bookings, calendarHref = '/admin/appointments/calendar' }: TodayScheduleProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold">Today&apos;s Schedule</CardTitle>
        <Link href={calendarHref} className="text-xs font-medium text-primary hover:underline">
          View calendar
        </Link>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No bookings scheduled today</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                style={{ borderLeftWidth: 4, borderLeftColor: getTherapistColor(booking.therapist.colorCode) }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{getPatientName(booking.patient)}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {booking.therapy.name} · {getTherapistName(booking.therapist)}
                  </p>
                  <p className="text-xs text-muted-foreground">{booking.room.name}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">
                    {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
                  </span>
                  <BookingStatusBadge status={booking.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
