'use client';

import { BookingSummary } from '@/components/booking/booking-summary';
import { AvailableSlotsPicker } from '@/components/booking/available-slots-picker';
import { PatientSearch } from '@/components/booking/patient-search';
import { QuickAddPatientDialog } from '@/components/booking/quick-add-patient-dialog';
import { SlotOccupancyPreview } from '@/components/booking/slot-occupancy-preview';
import { useSocketEvent } from '@/components/providers/socket-provider';
import { SocketEvents } from '@/lib/socket-events';
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
import { getPatient } from '@/lib/patient-api';
import {
  createBooking,
  fetchBookingsForDateRange,
  fetchTherapistAvailability,
  rescheduleBooking,
  searchPatients,
  updateBooking,
} from '@/lib/booking-api';
import {
  computeAvailableSlots,
  computeAvailableWindows,
  computeEndTimeFromSlot,
  getAvailableRooms,
  hasBlockingSlotIssues,
  isScheduleConstraintIssue,
  validateBookingSlot,
  type SlotValidationInput,
} from '@/lib/booking-validation';
import { useToast } from '@/components/providers/toast-provider';
import { getFriendlyErrorMessage } from '@/lib/error-utils';
import { ProgressDialog } from '@/components/shared/progress-dialog';
import { useProgressAction } from '@/hooks/use-progress-action';
import type { Booking, Patient, Room, Therapist, Therapy } from '@/lib/types';
import {
  combineDateAndTime,
  formatDateInput,
  formatDuration,
  formatTime,
  getPatientName,
  getTherapistColor,
  getTherapistName,
  parseDateInput,
  toTimeInputValue,
} from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plus } from 'lucide-react';
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
  const { showBookingSuccess } = useToast();
  const [step, setStep] = useState<'form' | 'summary'>('form');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [overrideScheduleConstraints, setOverrideScheduleConstraints] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [availability, setAvailability] = useState<
    import('@/lib/types').TherapistAvailability[]
  >([]);
  const [previewBookings, setPreviewBookings] = useState<Booking[]>(dayBookings);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [quickAddPatientOpen, setQuickAddPatientOpen] = useState(false);

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

  const slotPreviewInput: SlotValidationInput = useMemo(
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

  const validationOptions = useMemo(
    () => ({ overrideScheduleConstraints }),
    [overrideScheduleConstraints],
  );

  const availableWindows = useMemo(
    () =>
      computeAvailableWindows({
        date: watched.date,
        durationMinutes: selectedTherapy?.durationMinutes ?? 0,
        therapist: selectedTherapist,
        availability,
        dayBookings: previewBookings,
        excludeBookingId: mode === 'edit' && booking ? booking.id : undefined,
      }),
    [
      watched.date,
      selectedTherapy,
      selectedTherapist,
      availability,
      previewBookings,
      mode,
      booking,
    ],
  );

  const availableSlots = useMemo(
    () =>
      computeAvailableSlots({
        windows: availableWindows,
        durationMinutes: selectedTherapy?.durationMinutes ?? 0,
        date: watched.date,
        dayBookings: previewBookings,
        therapistId: watched.therapistId,
        excludeBookingId: mode === 'edit' && booking ? booking.id : undefined,
      }),
    [
      availableWindows,
      selectedTherapy,
      watched.date,
      previewBookings,
      watched.therapistId,
      mode,
      booking,
    ],
  );

  const availableStartTimes = useMemo(
    () => availableSlots.map((slot) => slot.startTime),
    [availableSlots],
  );

  const availableRooms = useMemo(
    () =>
      getAvailableRooms(
        rooms,
        previewBookings,
        watched.date,
        watched.startTime,
        selectedTherapy?.durationMinutes ?? 0,
        mode === 'edit' && booking ? booking.id : undefined,
      ),
    [rooms, previewBookings, watched.date, watched.startTime, selectedTherapy, mode, booking],
  );

  const availabilityIssues = useMemo(
    () => validateBookingSlot(slotPreviewInput, validationOptions),
    [slotPreviewInput, validationOptions],
  );

  const rawScheduleIssues = useMemo(
    () => validateBookingSlot(slotPreviewInput),
    [slotPreviewInput],
  );

  const scheduleConstraintIssues = rawScheduleIssues.filter(isScheduleConstraintIssue);
  const hasBlockingIssues = hasBlockingSlotIssues(availabilityIssues, validationOptions);
  const scheduleReady = Boolean(watched.therapistId && watched.therapyId && watched.date);
  const timeReady = Boolean(watched.startTime);
  const showRoomStep = scheduleReady && timeReady && !slotsLoading;

  const showOverrideToggle =
    scheduleConstraintIssues.length > 0 ||
    (Boolean(watched.startTime) &&
      availableStartTimes.length > 0 &&
      !availableStartTimes.includes(watched.startTime));

  const isFormValid =
    form.formState.isValid &&
    !hasBlockingIssues &&
    Boolean(selectedTherapy?.durationMinutes) &&
    Boolean(watched.roomId || mode === 'edit');

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
    setOverrideScheduleConstraints(false);
    setAvailability([]);
    setPreviewBookings(dayBookings);
    setSlotsLoading(false);
  }, [mode, booking, prefill, defaultDate, dayBookings, form]);

  const loadSlotSchedule = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!watched.therapistId || !watched.date) return [];
      if (!options?.silent) setSlotsLoading(true);
      try {
        const date = parseDateInput(watched.date);
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        const [slots, bookings] = await Promise.all([
          fetchTherapistAvailability(watched.therapistId),
          fetchBookingsForDateRange(start, end, 250),
        ]);
        setAvailability(slots);
        setPreviewBookings(bookings);
        return bookings;
      } catch {
        return [];
      } finally {
        if (!options?.silent) setSlotsLoading(false);
      }
    },
    [watched.therapistId, watched.date],
  );

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
    if (!watched.patientId) return;
    let cancelled = false;
    void getPatient(watched.patientId)
      .then(({ patient }) => {
        if (!cancelled) {
          setSelectedPatient({
            id: patient.id,
            firstName: patient.firstName,
            lastName: patient.lastName,
            medicalRecordNo: patient.medicalRecordNo,
            phone: patient.phone,
          });
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
    if (!open || !scheduleReady) return;
    void loadSlotSchedule();
  }, [open, scheduleReady, watched.therapistId, watched.date, loadSlotSchedule]);

  useSocketEvent(
    SocketEvents.BOOKING_UPDATED,
    () => {
      if (open && scheduleReady) void loadSlotSchedule();
    },
    open && scheduleReady,
  );

  useSocketEvent(
    SocketEvents.SCHEDULE_UPDATED,
    () => {
      if (open && scheduleReady) void loadSlotSchedule();
    },
    open && scheduleReady,
  );

  useEffect(() => {
    if (!open || mode === 'edit' || slotsLoading) return;
    if (watched.startTime && !availableStartTimes.includes(watched.startTime)) {
      form.setValue('startTime', '');
      form.setValue('roomId', '');
    }
  }, [availableStartTimes, watched.startTime, open, mode, slotsLoading, form]);

  useEffect(() => {
    if (!open || mode === 'edit') return;
    setOverrideScheduleConstraints(false);
    form.setValue('startTime', '');
    form.setValue('roomId', '');
  }, [watched.therapistId, watched.therapyId, open, mode, form]);

  useEffect(() => {
    if (!open || mode === 'edit') return;
    setOverrideScheduleConstraints(false);
    form.setValue('startTime', '');
    form.setValue('roomId', '');
  }, [watched.date, open, mode, form]);

  useEffect(() => {
    if (!open || mode === 'edit') return;
    form.setValue('roomId', '');
  }, [watched.startTime, open, mode, form]);

  useEffect(() => {
    if (!open || mode === 'edit') return;
    if (watched.startTime && !availableStartTimes.includes(watched.startTime)) {
      setOverrideScheduleConstraints(false);
    }
  }, [watched.startTime, availableStartTimes, open, mode]);

  useEffect(() => {
    if (!open || !showRoomStep || mode === 'edit') return;
    if (watched.roomId && !availableRooms.some((room) => room.id === watched.roomId)) {
      form.setValue('roomId', '');
    }
  }, [availableRooms, watched.roomId, showRoomStep, open, mode, form]);

  const handlePatientSearch = useCallback(
    (query: string, page = 1) => searchPatients(query, page),
    [],
  );

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
        overrideScheduleConstraints,
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

    const freshBookings = scheduleReady
      ? await loadSlotSchedule({ silent: true })
      : previewBookings;
    const confirmInput: SlotValidationInput = {
      ...slotPreviewInput,
      dayBookings: freshBookings,
    };
    const issues = validateBookingSlot(confirmInput, validationOptions);
    if (hasBlockingSlotIssues(issues, validationOptions)) {
      setSubmitError('This slot is no longer available. Please choose another.');
      setStep('form');
      return;
    }

    try {
      await run(
        mode === 'create' ? 'Creating booking…' : 'Saving changes…',
        async () => {
          const saved = await persistBooking();
          onOpenChange(false);
          onSuccess();
          if (mode === 'create' && saved) {
            showBookingSuccess(saved);
          }
        },
        mode === 'create' ? 'Saving booking…' : 'Updating calendar and records',
      );
    } catch (err) {
      setSubmitError(getFriendlyErrorMessage(err, 'Failed to save booking'));
    }
  }

  function handleReviewSubmit() {
    setSubmitError(null);
    void form.handleSubmit(() => {
      void (async () => {
        let freshBookings = previewBookings;
        if (scheduleReady) {
          freshBookings = await loadSlotSchedule({ silent: true });
          const reviewIssues = validateBookingSlot(
            { ...slotPreviewInput, dayBookings: freshBookings },
            validationOptions,
          );
          if (hasBlockingSlotIssues(reviewIssues, validationOptions)) {
            setSubmitError('This slot is no longer available. Please choose another.');
            return;
          }
        } else if (hasBlockingIssues) {
          setSubmitError('Resolve availability issues before continuing');
          return;
        }
        setStep('summary');
      })();
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
                    <div className="flex items-center justify-between gap-2">
                      <FormLabel>Patient</FormLabel>
                      {mode === 'create' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => setQuickAddPatientOpen(true)}
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Add
                        </Button>
                      )}
                    </div>
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                      >
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                      >
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {scheduleReady && (
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
              )}

              {scheduleReady && selectedTherapy && (
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <AvailableSlotsPicker
                          windows={availableWindows}
                          slots={availableSlots}
                          durationMinutes={selectedTherapy.durationMinutes}
                          value={field.value || undefined}
                          onChange={field.onChange}
                          loading={slotsLoading}
                        />
                      </FormControl>
                      {field.value && endTime && (
                        <p className="text-xs text-muted-foreground">
                          Ends at {formatTime(endTime)}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {showOverrideToggle && (
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={overrideScheduleConstraints}
                    onChange={(e) => setOverrideScheduleConstraints(e.target.checked)}
                  />
                  <span>
                    <span className="font-medium text-amber-950">Override schedule limits</span>
                    <span className="mt-0.5 block text-xs text-amber-800/90">
                      Allow booking outside consultation or availability hours.
                    </span>
                  </span>
                </label>
              )}

              {showRoomStep && (
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
                          {availableRooms.map((room) => {
                            const fullRoom = rooms.find((r) => r.id === room.id);
                            if (!fullRoom) return null;
                            return (
                              <SelectItem key={fullRoom.id} value={fullRoom.id}>
                                {fullRoom.name}
                                {fullRoom.code ? ` (${fullRoom.code})` : ''}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {availableRooms.length === 0 && (
                        <p className="text-xs text-destructive">
                          No rooms free at this time. Pick another slot.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional notes" rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showRoomStep && watched.roomId && (
                <SlotOccupancyPreview input={slotPreviewInput} issues={availabilityIssues} />
              )}

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

      <QuickAddPatientDialog
        open={quickAddPatientOpen}
        onOpenChange={setQuickAddPatientOpen}
        onCreated={(patient) => {
          setSelectedPatient(patient);
          form.setValue('patientId', patient.id, { shouldValidate: true });
        }}
      />
    </>
  );
}
