'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { useToast } from '@/components/providers/toast-provider';
import { BookingRescheduleModal } from '@/components/booking/booking-reschedule-modal';
import { CancelBookingDialog } from '@/components/booking/booking-dialogs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cancelBooking, fetchBooking } from '@/lib/booking-api';
import type { BookingNeedingAttention } from '@/lib/leave-api';
import { fetchBookingsNeedingAttention } from '@/lib/leave-api';
import { listRooms } from '@/lib/room-api';
import { listTherapists } from '@/lib/therapist-api';
import type { Booking, Room, Therapist } from '@/lib/types';
import { formatDateTime, getPatientName, getTherapistName } from '@/lib/utils';
import { useSocketEvent } from '@/components/providers/socket-provider';
import { SocketEvents } from '@/lib/socket-events';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface BookingsNeedsAttentionPanelProps {
  compact?: boolean;
  onActionComplete?: () => void;
}

export function BookingsNeedsAttentionPanel({
  compact,
  onActionComplete,
}: BookingsNeedsAttentionPanelProps) {
  const { user } = useAuth();
  const { showBookingAction } = useToast();
  const canManageBookings = user?.role === 'ADMIN';
  const [bookings, setBookings] = useState<BookingNeedingAttention[]>([]);
  const [loading, setLoading] = useState(true);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { bookings: rows } = await fetchBookingsNeedingAttention();
      setBookings(rows);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void Promise.all([
      listTherapists({ limit: 100, isActive: true }),
      listRooms({ limit: 100, isActive: true }),
    ]).then(([therapistResult, roomResult]) => {
      setTherapists(therapistResult.data);
      setRooms(roomResult.data);
    });
  }, [load]);

  useSocketEvent(SocketEvents.LEAVE_UPDATED, () => void load());
  useSocketEvent(SocketEvents.LEAVE_CONFLICT, () => void load());
  useSocketEvent(SocketEvents.BOOKING_UPDATED, () => void load());

  async function openReschedule(bookingId: string) {
    const { booking } = await fetchBooking(bookingId);
    setRescheduleBooking(booking);
  }

  function handleActionDone() {
    void load();
    onActionComplete?.();
  }

  if (loading) {
    return (
      <Card className="border-amber-200 bg-amber-50/40">
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking appointments needing attention…
        </CardContent>
      </Card>
    );
  }

  if (bookings.length === 0) {
    if (compact) return null;
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Appointments Needing Attention</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No leave-related booking conflicts at this time.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-amber-300 bg-amber-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Appointments Needing Attention ({bookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-amber-900/80">
            {canManageBookings
              ? 'These appointments overlap therapist leave. Postpone or cancel each booking before the leave takes effect.'
              : 'These appointments overlap your leave. Ask the clinic admin to postpone or cancel them before your leave starts.'}
          </p>
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 text-sm">
                <p className="font-medium text-slate-900">
                  {getPatientName(booking.patient)}
                  {booking.patient.phone ? ` · ${booking.patient.phone}` : ''}
                </p>
                <p className="text-muted-foreground">
                  {booking.therapy.name}
                  {booking.room ? ` · ${booking.room.name}` : ''}
                  {booking.therapist ? ` · ${getTherapistName(booking.therapist)}` : ''}
                </p>
                <p className="text-muted-foreground">{formatDateTime(booking.startTime)}</p>
                <p className="mt-1 text-xs font-medium text-amber-800">{booking.attentionReason}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {canManageBookings ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => void openReschedule(booking.id)}>
                      Postpone
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setCancelBookingId(booking.id);
                        setCancelOpen(true);
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {canManageBookings && (
        <>
          <BookingRescheduleModal
            open={!!rescheduleBooking}
            onOpenChange={(open) => {
              if (!open) setRescheduleBooking(null);
            }}
            booking={rescheduleBooking}
            therapists={therapists}
            rooms={rooms}
            onSuccess={() => {
              setRescheduleBooking(null);
              handleActionDone();
            }}
          />

          <CancelBookingDialog
            open={cancelOpen}
            onOpenChange={setCancelOpen}
            onSubmit={async (reason) => {
              if (!cancelBookingId) return;
              const { booking: updated } = await cancelBooking(cancelBookingId, {
                cancellationReason: reason,
              });
              setCancelBookingId(null);
              showBookingAction({
                action: 'cancel',
                booking: updated,
                cancellationReason: reason,
              });
              handleActionDone();
            }}
          />
        </>
      )}
    </>
  );
}
