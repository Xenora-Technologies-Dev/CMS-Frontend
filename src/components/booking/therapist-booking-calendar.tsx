'use client';

import { BookingCalendar } from '@/components/booking/booking-calendar';
import { useAuth } from '@/components/auth/auth-provider';

export function TherapistBookingCalendar() {
  const { user } = useAuth();
  return (
    <BookingCalendar
      lockedTherapistId={user?.therapistId ?? undefined}
      hideTitle
    />
  );
}
