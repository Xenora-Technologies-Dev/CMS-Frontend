import { TherapistBookingCalendar } from '@/components/booking/therapist-booking-calendar';

export default function TherapistCalendarPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Calendar</h1>
        <p className="text-sm text-muted-foreground">View your scheduled appointments</p>
      </div>
      <TherapistBookingCalendar />
    </div>
  );
}
