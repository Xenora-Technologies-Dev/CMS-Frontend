import { AdminPagePlaceholder } from '@/components/layout/admin-page-placeholder';
import { CalendarClock } from 'lucide-react';

export default function TodaysAppointmentsPage() {
  return (
    <AdminPagePlaceholder
      title="Today's Appointments"
      description="A chronological list of today's scheduled sessions will appear here."
      icon={CalendarClock}
    />
  );
}
