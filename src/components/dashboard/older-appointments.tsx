'use client';

import { BookingDetailDialog } from '@/components/booking/booking-dialogs';
import { BookingStatusBadge } from '@/components/booking/booking-status-badge';
import { UpcomingAppointmentsModal } from '@/components/dashboard/upcoming-appointments-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Booking } from '@/lib/types';
import {
  formatTime,
  getDoctorName,
  getPatientName,
  getTherapistName,
} from '@/lib/utils';
import { History } from 'lucide-react';
import { useState } from 'react';

const PREVIEW_LIMIT = 5;

interface OlderAppointmentsProps {
  bookings: Booking[];
  title?: string;
  viewerRole?: 'admin' | 'therapist' | 'doctor';
}

export function OlderAppointments({
  bookings,
  title = 'Older Appointments',
  viewerRole = 'therapist',
}: OlderAppointmentsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const preview = bookings.slice(0, PREVIEW_LIMIT);
  const hasMore = bookings.length > PREVIEW_LIMIT;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <History className="h-4 w-4 text-slate-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No past appointments in the last 30 days
            </p>
          ) : (
            <ul className="divide-y">
              {preview.map((booking) => {
                const date = new Date(booking.startTime);
                const staffLabel =
                  booking.bookingType === 'CONSULTATION'
                    ? booking.doctor
                      ? getDoctorName(booking.doctor)
                      : 'Consultation'
                    : booking.therapist
                      ? getTherapistName(booking.therapist)
                      : '—';
                return (
                  <li key={booking.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBooking(booking);
                        setDetailOpen(true);
                      }}
                      className="flex w-full items-start gap-3 rounded-lg py-3 text-left transition-colors first:pt-0 last:pb-0 hover:bg-slate-50"
                    >
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md bg-slate-100 text-center">
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                          {date.toLocaleDateString('en-GB', { month: 'short' })}
                        </span>
                        <span className="text-lg font-bold leading-none text-slate-900">
                          {date.getDate()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium text-slate-900">
                            {getPatientName(booking.patient)}
                          </p>
                          <BookingStatusBadge status={booking.status} />
                        </div>
                        <p className="truncate text-sm text-muted-foreground">
                          {booking.bookingType === 'CONSULTATION'
                            ? 'Consultation'
                            : (booking.therapy?.name ?? 'Appointment')}
                          {' · '}
                          {staffLabel}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(booking.startTime)} · {booking.room?.name ?? '—'}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
        {hasMore && (
          <div className="border-t px-6 pb-6 pt-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setModalOpen(true)}
            >
              View more ({bookings.length - PREVIEW_LIMIT} more)
            </Button>
          </div>
        )}
      </Card>

      <UpcomingAppointmentsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        bookings={bookings}
        title={title}
        viewerRole={viewerRole === 'doctor' ? 'admin' : viewerRole}
      />

      <BookingDetailDialog
        booking={selectedBooking}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        viewerRole={viewerRole === 'doctor' ? 'admin' : viewerRole}
      />
    </>
  );
}
