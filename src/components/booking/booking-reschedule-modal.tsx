'use client';

import { SlotOccupancyPreview } from '@/components/booking/slot-occupancy-preview';
import {
  BookingConflictAlert,
  parseConflictDetails,
} from '@/components/booking/booking-conflict-alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiRequestError } from '@/lib/api';
import {
  fetchBookingsForDateRange,
  fetchTherapistAvailability,
  rescheduleBooking,
} from '@/lib/booking-api';
import {
  computeEndTimeFromSlot,
  validateBookingSlot,
  type SlotValidationInput,
} from '@/lib/booking-validation';
import type { Booking, Room, Therapist } from '@/lib/types';
import {
  combineDateAndTime,
  formatDateInput,
  formatDuration,
  formatTime,
  formatTimeInputValue,
  generateTimeSlots,
  getPatientName,
  getTherapistName,
  parseDateInput,
  toTimeInputValue,
} from '@/lib/utils';
import { useToast } from '@/components/providers/toast-provider';
import { useEffect, useMemo, useState } from 'react';

interface BookingRescheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  therapists: Therapist[];
  rooms: Room[];
  onSuccess: (newStartTime?: string) => void;
}

export function BookingRescheduleModal({
  open,
  onOpenChange,
  booking,
  therapists,
  rooms,
  onSuccess,
}: BookingRescheduleModalProps) {
  const { showBookingAction } = useToast();
  const timeSlots = generateTimeSlots(8, 18, 15);
  const [dateValue, setDateValue] = useState('');
  const [therapistId, setTherapistId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [time, setTime] = useState('09:00');
  const [availability, setAvailability] = useState<
    import('@/lib/types').TherapistAvailability[]
  >([]);
  const [dayBookings, setDayBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [conflictDetails, setConflictDetails] = useState<ReturnType<typeof parseConflictDetails>>(null);
  const [loading, setLoading] = useState(false);

  const selectedTherapist = therapists.find((t) => t.id === therapistId);
  const durationMinutes = booking?.durationMinutes ?? booking?.therapy?.durationMinutes ?? 0;

  const endTime = useMemo(() => {
    if (!dateValue || !time || !durationMinutes) return null;
    return computeEndTimeFromSlot(dateValue, time, durationMinutes);
  }, [dateValue, time, durationMinutes]);

  const validationInput: SlotValidationInput = useMemo(
    () => ({
      date: dateValue,
      startTime: time,
      durationMinutes,
      therapistId,
      roomId,
      therapist: selectedTherapist,
      availability,
      dayBookings,
      excludeBookingId: booking?.id,
    }),
    [
      dateValue,
      time,
      durationMinutes,
      therapistId,
      roomId,
      selectedTherapist,
      availability,
      dayBookings,
      booking?.id,
    ],
  );

  const issues = useMemo(() => validateBookingSlot(validationInput), [validationInput]);
  const hasErrors = issues.some((i) => i.type === 'error');

  useEffect(() => {
    if (!open || !booking) return;
    const start = new Date(booking.startTime);
    setDateValue(formatDateInput(start));
    setTherapistId(booking.therapistId ?? '');
    setRoomId(booking.roomId);
    setTime(toTimeInputValue(booking.startTime));
    setError(null);
    setConflictDetails(null);
  }, [open, booking]);

  useEffect(() => {
    if (!therapistId) {
      setAvailability([]);
      return;
    }
    let cancelled = false;
    void fetchTherapistAvailability(therapistId)
      .then((slots) => {
        if (!cancelled) setAvailability(slots);
      })
      .catch(() => {
        if (!cancelled) setAvailability([]);
      });
    return () => {
      cancelled = true;
    };
  }, [therapistId]);

  useEffect(() => {
    if (!dateValue) return;
    let cancelled = false;
    const date = parseDateInput(dateValue);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    void fetchBookingsForDateRange(start, end)
      .then((list) => {
        if (!cancelled) setDayBookings(list);
      })
      .catch(() => {
        if (!cancelled) setDayBookings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [dateValue]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!booking || hasErrors) {
      setError('Resolve conflicts before rescheduling');
      return;
    }
    setLoading(true);
    setError(null);
    setConflictDetails(null);
    try {
      const previousStartTime = booking.startTime;
      const { booking: updated } = await rescheduleBooking(booking.id, {
        startTime: combineDateAndTime(parseDateInput(dateValue), time).toISOString(),
        therapistId,
        roomId,
      });
      onOpenChange(false);
      showBookingAction({
        action: 'postpone',
        booking: updated,
        previousStartTime,
      });
      onSuccess(updated.startTime);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setConflictDetails(parseConflictDetails(err));
      }
      setError(err instanceof Error ? err.message : 'Failed to reschedule');
    } finally {
      setLoading(false);
    }
  }

  if (!booking) return null;

  const currentRoom = rooms.find((r) => r.id === booking.roomId) ?? booking.room;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Postpone Appointment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border bg-slate-50 p-3 text-sm">
            <p className="mb-2 font-semibold text-slate-900">Current Appointment</p>
            <dl className="grid gap-1 text-muted-foreground sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase">Patient</dt>
                <dd className="font-medium text-slate-800">{getPatientName(booking.patient)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase">Therapy</dt>
                <dd className="font-medium text-slate-800">{booking.therapy?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase">Start</dt>
                <dd className="font-medium text-slate-800">{formatTime(booking.startTime)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase">End</dt>
                <dd className="font-medium text-slate-800">{formatTime(booking.endTime)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase">Therapist</dt>
                <dd className="font-medium text-slate-800">
                  {booking.therapist ? getTherapistName(booking.therapist) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase">Room</dt>
                <dd className="font-medium text-slate-800">{currentRoom.name}</dd>
              </div>
            </dl>
          </div>

          <p className="text-sm font-medium text-slate-700">New Schedule</p>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>New start time</Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {formatTimeInputValue(slot)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {endTime && (
            <p className="text-sm text-muted-foreground">
              End time: {time} – {formatTime(endTime)} ({formatDuration(durationMinutes)})
            </p>
          )}

          <div className="space-y-2">
            <Label>Therapist</Label>
            <Select value={therapistId} onValueChange={setTherapistId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {therapists.map((therapist) => (
                  <SelectItem key={therapist.id} value={therapist.id}>
                    {getTherapistName(therapist)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Room</Label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <SlotOccupancyPreview input={validationInput} issues={issues} />

          <BookingConflictAlert details={conflictDetails} fallbackMessage={error ?? undefined} />

          {error && !conflictDetails && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="submit" disabled={loading || hasErrors}>
              {loading ? 'Postponing…' : 'Confirm Postpone'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
