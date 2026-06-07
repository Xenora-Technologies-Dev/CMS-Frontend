'use client';

import type { Patient, Room, Therapist, Therapy } from '@/lib/types';
import {
  combineDateAndTime,
  formatDateInput,
  formatTimeInputValue,
  generateTimeSlots,
  getDoctorName,
  getPatientName,
  getTherapistName,
  parseDateInput,
} from '@/lib/utils';
import { canCompleteBooking } from '@/lib/appointment-list-utils';
import { BookingStatusBadge } from '@/components/booking/booking-status-badge';
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
import { Textarea } from '@/components/ui/textarea';
import { AppointmentSlipDialog } from '@/components/booking/appointment-slip';
import { BookingCommentsThread } from '@/components/booking/booking-comments-thread';
import { useClinicOptional } from '@/components/providers/clinic-provider';
import { formatDateTime, formatUserName } from '@/lib/appointment-list-utils';
import { fetchBookingAudits, fetchPatientBookings } from '@/lib/booking-api';
import type { AppointmentAudit, Booking } from '@/lib/types';
import { ExternalLink, FileText, History, RotateCcw, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface BookingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  selectedDate: Date;
  patients: Patient[];
  therapists: Therapist[];
  rooms: Room[];
  therapies: Therapy[];
  initialValues?: {
    patientId?: string;
    therapistId?: string;
    roomId?: string;
    therapyId?: string;
    startTime?: string;
    notes?: string;
  };
  submitLabel: string;
  showTimeField?: boolean;
  onSubmit: (values: {
    patientId: string;
    therapistId: string;
    roomId: string;
    therapyId: string;
    startTime: string;
    notes?: string;
  }) => Promise<void>;
}

export function BookingFormDialog({
  open,
  onOpenChange,
  title,
  selectedDate,
  patients,
  therapists,
  rooms,
  therapies,
  initialValues,
  submitLabel,
  showTimeField = true,
  onSubmit,
}: BookingFormDialogProps) {
  const timeSlots = generateTimeSlots(0, 24, 15);
  const [patientId, setPatientId] = useState('');
  const [therapistId, setTherapistId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [therapyId, setTherapyId] = useState('');
  const [time, setTime] = useState('09:00');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPatientId(initialValues?.patientId ?? '');
    setTherapistId(initialValues?.therapistId ?? '');
    setRoomId(initialValues?.roomId ?? '');
    setTherapyId(initialValues?.therapyId ?? '');
    setTime(
      initialValues?.startTime
        ? new Date(initialValues.startTime).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
        : '09:00',
    );
    setNotes(initialValues?.notes ?? '');
    setError(null);
  }, [open, initialValues]);

  const selectedTherapy = therapies.find((t) => t.id === therapyId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!patientId || !therapistId || !roomId || !therapyId || (showTimeField && !time)) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const startTime = showTimeField
        ? combineDateAndTime(selectedDate, time).toISOString()
        : (initialValues?.startTime ?? new Date().toISOString());
      await onSubmit({
        patientId,
        therapistId,
        roomId,
        therapyId,
        startTime,
        notes: notes.trim() || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save booking');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Patient</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {getPatientName(patient)} ({patient.medicalRecordNo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Therapist</Label>
            <Select value={therapistId} onValueChange={setTherapistId}>
              <SelectTrigger>
                <SelectValue placeholder="Select therapist" />
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
                <SelectValue placeholder="Select room" />
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

          <div className="space-y-2">
            <Label>Therapy</Label>
            <Select value={therapyId} onValueChange={setTherapyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select therapy" />
              </SelectTrigger>
              <SelectContent>
                {therapies.map((therapy) => (
                  <SelectItem key={therapy.id} value={therapy.id}>
                    {therapy.name} ({therapy.durationMinutes} min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTherapy && (
              <p className="text-xs text-muted-foreground">
                Duration: {selectedTherapy.durationMinutes} minutes
              </p>
            )}
          </div>

          {showTimeField && (
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
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
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface RescheduleBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  therapists: Therapist[];
  rooms: Room[];
  initialValues: {
    therapistId: string;
    roomId: string;
    startTime: string;
  };
  onSubmit: (values: {
    startTime: string;
    therapistId?: string;
    roomId?: string;
  }) => Promise<void>;
}

export function RescheduleBookingDialog({
  open,
  onOpenChange,
  therapists,
  rooms,
  initialValues,
  onSubmit,
}: RescheduleBookingDialogProps) {
  const timeSlots = generateTimeSlots(0, 24, 15);
  const [dateValue, setDateValue] = useState('');
  const [therapistId, setTherapistId] = useState(initialValues.therapistId);
  const [roomId, setRoomId] = useState(initialValues.roomId);
  const [time, setTime] = useState('09:00');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const start = new Date(initialValues.startTime);
    setDateValue(formatDateInput(start));
    setTherapistId(initialValues.therapistId);
    setRoomId(initialValues.roomId);
    setTime(
      start.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
    );
    setError(null);
  }, [open, initialValues]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        startTime: combineDateAndTime(parseDateInput(dateValue), time).toISOString(),
        therapistId,
        roomId,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reschedule booking');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule Booking</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label>New Start Time</Label>
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Rescheduling…' : 'Reschedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface CancelBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => Promise<void>;
}

export function CancelBookingDialog({ open, onOpenChange, onSubmit }: CancelBookingDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit(reason.trim());
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel booking');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Appointment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for cancellation"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Keep Booking
            </Button>
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading ? 'Cancelling…' : 'Confirm Cancel'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface BookingDetailDialogProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onReschedule?: () => void;
  onCancel?: () => void;
  onRestore?: () => void;
  onComplete?: () => void;
  /** When set, hides admin-only actions and uses read-only staff view. */
  viewerRole?: 'admin' | 'therapist' | 'doctor';
  /** Called after a comment is posted on the booking. */
  onCommentPosted?: () => void;
}

export function BookingDetailDialog({
  booking,
  open,
  onOpenChange,
  onEdit,
  onReschedule,
  onCancel,
  onRestore,
  onComplete,
  viewerRole = 'admin',
  onCommentPosted,
}: BookingDetailDialogProps) {
  const [slipOpen, setSlipOpen] = useState(false);
  const [audits, setAudits] = useState<AppointmentAudit[]>([]);
  const [patientHistory, setPatientHistory] = useState<Booking[]>([]);
  const clinicContext = useClinicOptional();

  useEffect(() => {
    if (!open || !booking || viewerRole === 'therapist' || viewerRole === 'doctor') {
      setAudits([]);
      return;
    }
    let cancelled = false;
    void fetchBookingAudits(booking.id)
      .then((rows) => {
        if (!cancelled) setAudits(rows);
      })
      .catch(() => {
        if (!cancelled) setAudits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, booking, viewerRole]);

  useEffect(() => {
    if (!open || !booking) {
      setPatientHistory([]);
      return;
    }
    let cancelled = false;
    void fetchPatientBookings(booking.patientId, 20)
      .then((rows) => {
        if (!cancelled) {
          setPatientHistory(
            rows
              .filter(
                (b) =>
                  b.id !== booking.id &&
                  !['RESCHEDULED', 'CANCELLED', 'NO_SHOW'].includes(b.status),
              )
              .slice(0, 8),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setPatientHistory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, booking]);

  if (!booking) return null;

  const isStaffView = viewerRole === 'therapist' || viewerRole === 'doctor';
  const isConsultation = booking.bookingType === 'CONSULTATION';
  const canModify =
    !isStaffView &&
    !isConsultation &&
    ['SCHEDULED', 'CONFIRMED', 'PENDING_CONFIRMATION'].includes(booking.status);
  const canComplete = !isStaffView && onComplete && canCompleteBooking(booking);
  const canComment = ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(
    booking.status,
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="pr-8">{getPatientName(booking.patient)}</DialogTitle>
          </DialogHeader>

          <dl className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="shrink-0 text-muted-foreground">Status</dt>
              <dd>
                <BookingStatusBadge status={booking.status} />
              </dd>
            </div>
            {isConsultation ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <dt className="shrink-0 text-muted-foreground">Type</dt>
                  <dd className="text-right font-medium">Consultation</dd>
                </div>
                {booking.doctor && (
                  <div className="flex items-start justify-between gap-4">
                    <dt className="shrink-0 text-muted-foreground">Doctor</dt>
                    <dd className="text-right font-medium">{getDoctorName(booking.doctor)}</dd>
                  </div>
                )}
                {booking.bookingMode && (
                  <div className="flex items-start justify-between gap-4">
                    <dt className="shrink-0 text-muted-foreground">Mode</dt>
                    <dd className="text-right font-medium">
                      {booking.bookingMode === 'CALL' ? 'Call' : 'Walk-In'}
                    </dd>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <dt className="shrink-0 text-muted-foreground">Therapy</dt>
                  <dd className="text-right font-medium">{booking.therapy?.name ?? '—'}</dd>
                </div>
                {booking.therapist && (
                  <div className="flex items-start justify-between gap-4">
                    <dt className="shrink-0 text-muted-foreground">Therapist</dt>
                    <dd className="text-right font-medium">
                      {getTherapistName(booking.therapist)}
                    </dd>
                  </div>
                )}
              </>
            )}
            <div className="flex items-start justify-between gap-4">
              <dt className="shrink-0 text-muted-foreground">Room</dt>
              <dd className="text-right font-medium">{booking.room.name}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="shrink-0 text-muted-foreground">Time</dt>
              <dd className="text-right font-medium">
                {new Date(booking.startTime).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}{' '}
                –{' '}
                {new Date(booking.endTime).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="shrink-0 text-muted-foreground">Duration</dt>
              <dd className="text-right font-medium">{booking.durationMinutes} min</dd>
            </div>
            {!isStaffView && booking.notes && (
              <div>
                <dt className="text-muted-foreground">Legacy Notes</dt>
                <dd className="mt-1">{booking.notes}</dd>
              </div>
            )}
            {canComment && (
              <div>
                <BookingCommentsThread
                  bookingId={booking.id}
                  canComment={canComment}
                  viewerRole={viewerRole}
                />
              </div>
            )}
            {patientHistory.length > 0 && (
              <div className="border-t pt-3">
                <dt className="mb-2 flex items-center gap-1.5 font-medium text-slate-700">
                  <History className="h-4 w-4" />
                  Patient Visit History
                </dt>
                <dd className="max-h-48 space-y-2 overflow-y-auto text-xs">
                  {patientHistory.map((visit) => (
                    <div key={visit.id} className="rounded border bg-slate-50 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">
                          {visit.bookingType === 'CONSULTATION'
                            ? 'Consultation'
                            : (visit.therapy?.name ?? 'Therapy')}
                        </span>
                        <BookingStatusBadge status={visit.status} />
                      </div>
                      <p className="text-muted-foreground">{formatDateTime(visit.startTime)}</p>
                      <p className="text-muted-foreground">
                        {visit.bookingType === 'CONSULTATION' && visit.doctor
                          ? getDoctorName(visit.doctor)
                          : visit.therapist
                            ? getTherapistName(visit.therapist)
                            : '—'}
                        {visit.room ? ` · ${visit.room.name}` : ''}
                      </p>
                    </div>
                  ))}
                </dd>
              </div>
            )}
            {booking.cancellationReason && (
              <div>
                <dt className="text-muted-foreground">Cancellation Reason</dt>
                <dd className="mt-1 text-red-700">{booking.cancellationReason}</dd>
              </div>
            )}
            {!isStaffView && (
              <div className="border-t pt-3">
                <dt className="mb-2 font-medium text-slate-700">Admin Tracking</dt>
                <dd className="space-y-1 text-xs text-muted-foreground">
                  <p>Created by {formatUserName(booking.createdBy)} · {formatDateTime(booking.createdAt)}</p>
                  {booking.updatedBy && (
                    <p>Modified by {formatUserName(booking.updatedBy)} · {formatDateTime(booking.updatedAt)}</p>
                  )}
                  {booking.cancelledBy && (
                    <p>Cancelled by {formatUserName(booking.cancelledBy)} · {formatDateTime(booking.cancelledAt)}</p>
                  )}
                  {booking.rescheduledBy && (
                    <p>Rescheduled by {formatUserName(booking.rescheduledBy)} · {formatDateTime(booking.rescheduledAt)}</p>
                  )}
                </dd>
              </div>
            )}
            {!isStaffView && audits.length > 0 && (
              <div className="border-t pt-3">
                <dt className="mb-2 font-medium text-slate-700">Change History</dt>
                <dd className="max-h-40 space-y-2 overflow-y-auto text-xs">
                  {audits.map((audit) => (
                    <div key={audit.id} className="rounded border bg-slate-50 p-2">
                      <p className="font-medium capitalize">{audit.action.toLowerCase()}</p>
                      <p className="text-muted-foreground">
                        {formatUserName(audit.performedBy)} · {formatDateTime(audit.performedAt)}
                      </p>
                      {audit.oldStartTime && audit.newStartTime && (
                        <p className="text-muted-foreground">
                          {formatDateTime(audit.oldStartTime)} → {formatDateTime(audit.newStartTime)}
                        </p>
                      )}
                      {audit.cancellationReason && (
                        <p className="text-red-700">Reason: {audit.cancellationReason}</p>
                      )}
                    </div>
                  ))}
                </dd>
              </div>
            )}
          </dl>

          <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
              {!isStaffView && (
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/admin/patients/${booking.patientId}`}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Patient
                  </Link>
                </Button>
              )}
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setSlipOpen(true)}
              >
                <FileText className="mr-2 h-4 w-4" />
                Appointment Slip
              </Button>
            </div>

            {canModify && onEdit && onReschedule && onCancel && (
              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
                <Button variant="outline" className="w-full" onClick={onEdit}>
                  Edit
                </Button>
                <Button variant="secondary" className="w-full" onClick={onReschedule}>
                  Postpone
                </Button>
                <Button variant="destructive" className="w-full" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            )}
            {!isStaffView &&
              isConsultation &&
              onCancel &&
              ['SCHEDULED', 'CONFIRMED', 'PENDING_CONFIRMATION'].includes(booking.status) && (
                <Button variant="destructive" className="w-full" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            {!isStaffView && booking.status === 'CANCELLED' && onRestore && (
              <Button variant="outline" className="w-full" onClick={onRestore}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Restore Appointment
              </Button>
            )}
            {canComplete && (
              <Button variant="default" className="w-full" onClick={onComplete}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Mark Completed
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AppointmentSlipDialog
        booking={booking}
        clinic={clinicContext?.clinic}
        open={slipOpen}
        onOpenChange={setSlipOpen}
      />
    </>
  );
}
