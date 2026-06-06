import type { Booking } from '@/lib/types';
import { formatTime, getPatientName, getTherapistName } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UpcomingAppointmentsProps {
  bookings: Booking[];
  title?: string;
}

export function UpcomingAppointments({
  bookings,
  title = 'Upcoming Appointments',
}: UpcomingAppointmentsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No upcoming appointments</p>
        ) : (
          <ul className="divide-y">
            {bookings.map((booking) => {
              const date = new Date(booking.startTime);
              return (
                <li key={booking.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md bg-slate-100 text-center">
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                      {date.toLocaleDateString('en-GB', { month: 'short' })}
                    </span>
                    <span className="text-lg font-bold leading-none text-slate-900">
                      {date.getDate()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{getPatientName(booking.patient)}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {booking.therapy?.name ?? 'Appointment'} ·{' '}
                      {booking.therapist ? getTherapistName(booking.therapist) : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(booking.startTime)} · {booking.room.name}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
