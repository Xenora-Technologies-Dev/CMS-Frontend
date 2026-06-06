'use client';

import { ConsultationBookingCalendar } from '@/components/booking/consultation-booking-calendar';
import { useAuth } from '@/components/auth/auth-provider';

export function DoctorBookingCalendar() {
  const { user } = useAuth();
  return (
    <ConsultationBookingCalendar
      lockedDoctorId={user?.doctorId ?? undefined}
      hideTitle
    />
  );
}
