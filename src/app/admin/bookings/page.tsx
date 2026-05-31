import { redirect } from 'next/navigation';

export default function AdminBookingsRedirectPage() {
  redirect('/admin/appointments/calendar');
}
