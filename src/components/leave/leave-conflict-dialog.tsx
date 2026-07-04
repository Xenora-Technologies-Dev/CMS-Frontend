'use client';

import { BookingRescheduleModal } from '@/components/booking/booking-reschedule-modal';
import { CancelBookingDialog } from '@/components/booking/booking-dialogs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { buildCancelBookingPayload, cancelBooking, fetchBooking } from '@/lib/booking-api';
import { listRooms } from '@/lib/room-api';
import { listTherapists } from '@/lib/therapist-api';
import type { AffectedBooking, LeaveRequest } from '@/lib/leave-api';
import type { Booking, Room, Therapist } from '@/lib/types';
import { formatDateTime, getTherapistName } from '@/lib/utils';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LeaveConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leave: LeaveRequest | null;
  affectedBookings: AffectedBooking[];
  onConfirmApprove: () => void;
  loading?: boolean;
}

export function LeaveConflictDialog({
  open,
  onOpenChange,
  leave,
  affectedBookings,
  onConfirmApprove,
  loading,
}: LeaveConflictDialogProps) {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void Promise.all([
      listTherapists({ limit: 100, isActive: true }),
      listRooms({ limit: 100, isActive: true }),
    ]).then(([therapistResult, roomResult]) => {
      setTherapists(therapistResult.data);
      setRooms(roomResult.data);
    });
  }, [open]);

  async function openReschedule(bookingId: string) {
    setActionLoading(bookingId);
    try {
      const { booking } = await fetchBooking(bookingId);
      setRescheduleBooking(booking);
    } finally {
      setActionLoading(null);
    }
  }

  function openCancel(bookingId: string) {
    setCancelBookingId(bookingId);
    setCancelOpen(true);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Therapist Leave Conflict
            </DialogTitle>
          </DialogHeader>
          {leave && (
            <p className="text-sm text-muted-foreground">
              Approving leave for {getTherapistName(leave.therapist)} will affect the following
              appointments. You can postpone or cancel them before approving.
            </p>
          )}
          <div className="space-y-3">
            {affectedBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium">
                    {booking.patient.firstName} {booking.patient.lastName}
                  </p>
                  <p className="text-muted-foreground">{booking.patient.phone ?? '—'}</p>
                  <p className="text-muted-foreground">{booking.therapy.name}</p>
                  <p className="text-muted-foreground">{formatDateTime(booking.startTime)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!actionLoading || loading}
                    onClick={() => void openReschedule(booking.id)}
                  >
                    {actionLoading === booking.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Postpone'
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={!!actionLoading || loading}
                    onClick={() => openCancel(booking.id)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Close
            </Button>
            <Button onClick={onConfirmApprove} disabled={loading}>
              {loading ? 'Approving…' : 'Approve Leave Anyway'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BookingRescheduleModal
        open={!!rescheduleBooking}
        onOpenChange={(o) => {
          if (!o) setRescheduleBooking(null);
        }}
        booking={rescheduleBooking}
        therapists={therapists}
        rooms={rooms}
        onSuccess={() => setRescheduleBooking(null)}
      />

      <CancelBookingDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onSubmit={async (input) => {
          if (!cancelBookingId) return;
          await cancelBooking(cancelBookingId, buildCancelBookingPayload(input));
          setCancelBookingId(null);
        }}
      />
    </>
  );
}
