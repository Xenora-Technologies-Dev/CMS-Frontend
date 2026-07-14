'use client';

import { BookingCalendar } from '@/components/booking/booking-calendar';
import { useAuth } from '@/components/auth/auth-provider';

export function DoctorAllAppointmentsCalendar() {
  const { user } = useAuth();

  return (
    <BookingCalendar
      doctorViewAll
      selfDoctorId={user?.doctorId ?? undefined}
      hideTitle
      pageTitle="All Appointments"
      pageDescription="Clinic-wide daily schedule · filters by therapist/doctor and room · view-only"
    />
  );
}
