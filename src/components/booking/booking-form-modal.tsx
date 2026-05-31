'use client';

import { BookingSummary } from '@/components/booking/booking-summary';
import { PatientSearch } from '@/components/booking/patient-search';
import { SlotOccupancyPreview } from '@/components/booking/slot-occupancy-preview';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  createBooking,
  fetchBookingsForDateRange,
  fetchTherapistAvailability,
  rescheduleBooking,
  searchPatients,
  updateBooking,
} from '@/lib/booking-api';
import {
  computeEndTimeFromSlot,
  validateBookingSlot,
  type SlotValidationInput,
} from '@/lib/booking-validation';
import { autoDownloadAppointmentSlip } from '@/lib/appointment-slip-utils';
import { getFriendlyErrorMessage } from '@/lib/error-utils';
import { ProgressDialog } from '@/components/shared/progress-dialog';
import { useProgressAction } from '@/hooks/use-progress-action';
import type { Booking, Patient, Room, Therapist, Therapy } from '@/lib/types';
import {
  combineDateAndTime,
  formatDateInput,
  formatDuration,
  formatTime,
  generateTimeSlots,
  getPatientName,
  getTherapistColor,
  getTherapistName,
  parseDateInput,
  toTimeInputValue,
} from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const bookingFormSchema = z.object({
  patientId: z.string().uuid('Select a patient'),
  therapistId: z.string().uuid('Select a therapist'),
  therapyId: z.string().uuid('Select a therapy'),
  roomId: z.string().uuid('Select a room'),
  date: z.string().min(1, 'Select a date'),
  startTime: z.string().min(1, 'Select a start time'),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

export interface BookingSlotPrefill {
  roomId?: string;
  startTime?: string;
  date?: Date;
}

interface BookingFormModalProps {
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: Date;
  therapists: Therapist[];
  rooms: Room[];
  therapies: Therapy[];
  dayBookings: Booking[];
  booking?: Booking | null;
  prefill?: BookingSlotPrefill;
  onSuccess: () => void;
}

export function BookingFormModal({
  mode,
  open,
  onOpenChange,
  defaultDate,
  therapists,
  rooms,
  therapies,
  dayBookings,
  booking,
  prefill,
  onSuccess,
}: BookingFormModalProps) {
  const { progress, run } = useProgressAction();
  const timeSlots = generateTimeSlots(8, 18, 15);
  const [step, setStep] = useState<'form' | 'summary'>('form');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [availability, setAvailability] = useState<
    import('@/lib/types').TherapistAvailability[]
  >([]);
  const [previewBookings, setPreviewBookings] = useState<Booking[]>(dayBookings);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      patientId: '',
      therapistId: '',
      therapyId: '',
      roomId: '',
      date: formatDateInput(defaultDate),
      startTime: '09:00',
      notes: '',
    },
    mode: 'onChange',
  });

  const watched = form.watch();
  const selectedTherapy = therapies.find((t) => t.id === watched.therapyId);
  const selectedTherapist = therapists.find((t) => t.id === watched.therapistId);
  const selectedRoom = rooms.find((r) => r.id === watched.roomId);

  const endTime = useMemo(() => {
    if (!watched.date || !watched.startTime || !selectedTherapy) return null;
    return computeEndTimeFromSlot(watched.date, watched.startTime, selectedTherapy.durationMinutes);
  }, [watched.date, watched.startTime, selectedTherapy]);

  const validationInput: SlotValidationInput = useMemo(
    () => ({
      date: watched.date,
      startTime: watched.startTime,
      durationMinutes: selectedTherapy?.durationMinutes ?? 0,
      therapistId: watched.therapistId,
      roomId: watched.roomId,
      therapist: selectedTherapist,
      availability,
      dayBookings: previewBookings,
      excludeBookingId: mode === 'edit' && booking ? booking.id : undefined,
    }),
    [
      watched.date,
      watched.startTime,
      watched.therapistId,
      watched.roomId,
      selectedTherapy,
      selectedTherapist,
      availability,
      previewBookings,
      mode,
      booking,
    ],
  );

  const availabilityIssues = useMemo(
    () => validateBookingSlot(validationInput),
    [validationInput],
  );

  const hasBlockingIssues = availabilityIssues.some((issue) => issue.type === 'error');
  const isFormValid =
    form.formState.isValid &&
    !hasBlockingIssues &&
    Boolean(selectedTherapy?.durationMinutes);

  const resetForm = useCallback(() => {
    const baseDate = prefill?.date ?? defaultDate;
    if (mode === 'edit' && booking) {
      form.reset({
        patientId: booking.patientId,
        therapistId: booking.therapistId,
        therapyId: booking.therapyId,
        roomId: booking.roomId,
        date: formatDateInput(new Date(booking.startTime)),
        startTime: toTimeInputValue(booking.startTime),
        notes: booking.notes ?? '',
      });
      setSelectedPatient(booking.patient);
    } else {
      form.reset({
        patientId: '',
        therapistId: '',
        therapyId: '',
        roomId: prefill?.roomId ?? '',
        date: formatDateInput(baseDate),
        startTime: prefill?.startTime ?? '09:00',
        notes: '',
      });
      setSelectedPatient(null);
    }
    setStep('form');
    setSubmitError(null);
    setAvailability([]);
    setPreviewBookings(dayBookings);
  }, [mode, booking, prefill, defaultDate, dayBookings, form]);

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open, resetForm]);

  useEffect(() => {
    if (!watched.patientId) {
      setSelectedPatient(null);
      return;
    }
    if (mode === 'edit' && booking?.patientId === watched.patientId) {
      setSelectedPatient(booking.patient);
      return;
    }
    let cancelled = false;
    void searchPatients('')
      .then((patients) => {
        if (!cancelled) {
          setSelectedPatient(patients.find((p) => p.id === watched.patientId) ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setSelectedPatient(null);
      });
    return () => {
      cancelled = true;
    };
  }, [watched.patientId, mode, booking]);

  useEffect(() => {
    if (!watched.therapistId) {
      setAvailability([]);
      return;
    }
    let cancelled = false;
    void fetchTherapistAvailability(watched.therapistId)
      .then((slots) => {
        if (!cancelled) setAvailability(slots);
      })
      .catch(() => {
        if (!cancelled) setAvailability([]);
      });
    return () => {
      cancelled = true;
    };
  }, [watched.therapistId]);

  useEffect(() => {
    if (!watched.date) return;
    let cancelled = false;
    const date = parseDateInput(watched.date);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    void fetchBookingsForDateRange(start, end)
      .then((list) => {
        if (!cancelled) setPreviewBookings(list);
      })
      .catch(() => {
        if (!cancelled) setPreviewBookings(dayBookings);
      });
    return () => {
      cancelled = true;
    };
  }, [watched.date, dayBookings]);

  const handlePatientSearch = useCallback((query: string) => searchPatients(query, 30), []);

  async function persistBooking(): Promise<Booking | undefined> {
    const values = form.getValues();
    const startIso = combineDateAndTime(
      parseDateInput(values.date),
      values.startTime,
    ).toISOString();

    if (mode === 'create') {
      const { booking: created } = await createBooking({
        patientId: values.patientId,
        therapistId: values.therapistId,
        roomId: values.roomId,
        therapyId: values.therapyId,
        startTime: startIso,
        notes: values.notes?.trim() || undefined,
      });
      return created;
    }

    if (!booking) return undefined;

    const originalStart = new Date(booking.startTime).getTime();
    const newStart = new Date(startIso).getTime();
    const slotChanged =
      newStart !== originalStart ||
      values.therapistId !== booking.therapistId ||
      values.roomId !== booking.roomId;

    let targetId = booking.id;

    if (slotChanged) {
      const { booking: rescheduled } = await rescheduleBooking(booking.id, {
        startTime: startIso,
        therapistId: values.therapistId,
        roomId: values.roomId,
      });
      targetId = rescheduled.id;
    }

    const patientChanged = values.patientId !== booking.patientId;
    const therapyChanged = values.therapyId !== booking.therapyId;
    const notesChanged = (values.notes ?? '') !== (booking.notes ?? '');
    const therapistChanged = !slotChanged && values.therapistId !== booking.therapistId;
    const roomChanged = !slotChanged && values.roomId !== booking.roomId;

    if (
      patientChanged ||
      therapyChanged ||
      notesChanged ||
      therapistChanged ||
      roomChanged
    ) {
      await updateBooking(targetId, {
        ...(patientChanged && { patientId: values.patientId }),
        ...(therapyChanged && { therapyId: values.therapyId }),
        ...(therapistChanged && { therapistId: values.therapistId }),
        ...(roomChanged && { roomId: values.roomId }),
        notes: values.notes?.trim() || null,
      });
    }

    return booking;
  }

  async function handleConfirm() {
    setSubmitError(null);
    const issues = validateBookingSlot(validationInput);
    if (issues.some((i) => i.type === 'error')) {
      setSubmitError('Resolve availability issues before saving');
      setStep('form');
      return;
    }

    try {
      await run(
        mode === 'create' ? 'Creating booking…' : 'Saving changes…',
        async () => {
          const saved = await persistBooking();
          if (mode === 'create' && saved) {
            await autoDownloadAppointmentSlip(saved);
          }
          onOpenChange(false);
          onSuccess();
        },
        mode === 'create'
          ? 'Generating appointment slip PDF'
          : 'Updating calendar and records',
      );
    } catch (err) {
      setSubmitError(getFriendlyErrorMessage(err, 'Failed to save booking'));
    }
  }

  function handleReviewSubmit() {
    setSubmitError(null);
    void form.handleSubmit(() => {
      if (hasBlockingIssues) {
        setSubmitError('Resolve availability issues before continuing');
        return;
      }
      setStep('summary');
    })();
  }

  const patientDisplayName = selectedPatient
    ? getPatientName(selectedPatient)
    : mode === 'edit' && booking
      ? getPatientName(booking.patient)
      : 'Selected patient';

  const title =
    step === 'summary'
      ? mode === 'create'
        ? 'Confirm Booking'
        : 'Confirm Changes'
      : mode === 'create'
        ? 'Create Booking'
        : 'Edit Booking';

  return (
    <>
      <ProgressDialog
        open={progress.open}
        title={progress.title}
        description={progress.description}
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {step === 'summary' &&
        selectedTherapy &&
        selectedTherapist &&
        selectedRoom &&
        endTime ? (
          <div className="space-y-4">
            <BookingSummary
              patientName={patientDisplayName}
              therapist={selectedTherapist}
              therapy={selectedTherapy}
              room={selectedRoom}
              date={watched.date}
              startTime={watched.startTime}
              endTime={endTime}
            />
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep('form')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button type="button" onClick={() => void handleConfirm()} disabled={progress.open}>
                {progress.open
                  ? 'Saving…'
                  : mode === 'create'
                    ? 'Confirm & Create'
                    : 'Confirm & Save'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleReviewSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="patientId"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Patient</FormLabel>
                    <FormControl>
                      <PatientSearch
                        value={field.value}
                        onChange={field.onChange}
                        onSearch={handlePatientSearch}
                        error={!!fieldState.error}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="therapistId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Therapist</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select therapist" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {therapists.map((therapist) => (
                            <SelectItem key={therapist.id} value={therapist.id}>
                              <span className="flex items-center gap-2">
                                <span
                                  className="inline-block h-2 w-2 rounded-full"
                                  style={{
                                    backgroundColor: getTherapistColor(therapist.colorCode),
                                  }}
                                />
                                {getTherapistName(therapist)}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="therapyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Therapy</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select therapy" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {therapies.map((therapy) => (
                            <SelectItem key={therapy.id} value={therapy.id}>
                              {therapy.name} ({formatDuration(therapy.durationMinutes)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedTherapy && (
                        <FormDescription>
                          Session length: {formatDuration(selectedTherapy.durationMinutes)} —
                          drives end time and calendar block height
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="roomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select room" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name}
                            {room.code ? ` (${room.code})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeSlots.map((slot) => (
                            <SelectItem key={slot} value={slot}>
                              {slot}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {selectedTherapy && endTime && watched.startTime && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-700">End time (auto-calculated)</span>
                    <span className="font-semibold text-slate-900">
                      {watched.startTime} – {formatTime(endTime)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Based on {selectedTherapy.name} · {formatDuration(selectedTherapy.durationMinutes)}
                  </p>
                </div>
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional notes"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SlotOccupancyPreview input={validationInput} issues={availabilityIssues} />

              {submitError && <p className="text-sm text-destructive">{submitError}</p>}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!isFormValid}>
                  {mode === 'create' ? 'Review Booking' : 'Review Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
