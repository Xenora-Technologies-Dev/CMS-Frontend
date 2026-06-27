'use client';

import { BookingSummary } from '@/components/booking/booking-summary';
import { AvailableSlotsPicker } from '@/components/booking/available-slots-picker';
import { PatientSearch } from '@/components/booking/patient-search';
import { TherapistSearch } from '@/components/booking/therapist-search';
import { TherapySearch } from '@/components/booking/therapy-search';
import { QuickAddPatientDialog } from '@/components/booking/quick-add-patient-dialog';
import { QuickAddTherapyDialog } from '@/components/booking/quick-add-therapy-dialog';
import { SlotOccupancyPreview } from '@/components/booking/slot-occupancy-preview';
import { useClinicOptional } from '@/components/providers/clinic-provider';
import { useSocketEvent } from '@/components/providers/socket-provider';
import { isAllowBookingOutsideConsultationHoursEnabled } from '@/lib/clinic-api';
import { SocketEvents } from '@/lib/socket-events';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  searchTherapies,
  searchTherapists,
  updateBooking,
} from '@/lib/booking-api';
import {
  computeAvailableWindows,
  computeScheduleSlots,
  computeEndTimeFromSlot,
  getAvailableRooms,
  hasBlockingSlotIssues,
  validateBookingSlot,
  type SlotValidationInput,
  type ApprovedLeaveBlock,
} from '@/lib/booking-validation';
import { fetchApprovedLeaves } from '@/lib/leave-api';
import { useToast } from '@/components/providers/toast-provider';
import { useBookingWhatsApp } from '@/components/whatsapp/booking-whatsapp-provider';
import { getFriendlyErrorMessage } from '@/lib/error-utils';
import {
  getLastTherapistIdFromPlan,
  PackageConfigPanel,
  PatientPackagesPanel,
} from '@/components/booking/package-selection-panel';
import { getActivePatientPackages } from '@/lib/treatment-plan-api';
import type { Booking, Patient, Room, Therapist, Therapy, TreatmentPlan } from '@/lib/types';
import {
  combineDateAndTime,
  formatDateInput,
  formatTime,
  getPatientName,
  getTherapistColor,
  getTherapistName,
  parseDateInput,
  toTimeInputValue,
} from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  onTherapyCreated?: (therapy: Therapy) => void;
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
  onTherapyCreated,
}: BookingFormModalProps) {
  const { showBookingSuccess } = useToast();
  const { notifyAfterBookingAction } = useBookingWhatsApp();
  const [confirming, setConfirming] = useState(false);
  const clinicContext = useClinicOptional();
  const overrideScheduleConstraints = isAllowBookingOutsideConsultationHoursEnabled(
    clinicContext?.clinic,
  );
  const [step, setStep] = useState<'form' | 'summary'>('form');
  const [reviewing, setReviewing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const actionBusy = reviewing || confirming;
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [availability, setAvailability] = useState<
    import('@/lib/types').TherapistAvailability[]
  >([]);
  const [previewBookings, setPreviewBookings] = useState<Booking[]>(dayBookings);
  const [approvedLeaves, setApprovedLeaves] = useState<ApprovedLeaveBlock[]>([]);
  const [slotsRefreshing, setSlotsRefreshing] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const slotsLoadedForKeyRef = useRef<string | null>(null);
  const slotsRefreshRequestIdRef = useRef(0);
  const slotsBackgroundRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [quickAddPatientOpen, setQuickAddPatientOpen] = useState(false);
  const [quickAddTherapyOpen, setQuickAddTherapyOpen] = useState(false);
  const [therapyOptions, setTherapyOptions] = useState<Therapy[]>(therapies);
  const [therapistOptions, setTherapistOptions] = useState<Therapist[]>(therapists);
  const [patientPackages, setPatientPackages] = useState<TreatmentPlan[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [continuingPlanId, setContinuingPlanId] = useState<string | null>(null);
  const [isPackage, setIsPackage] = useState(false);
  const [packageSessions, setPackageSessions] = useState('');
  const [packageValidityDays, setPackageValidityDays] = useState('365');
  const dayBookingsRef = useRef(dayBookings);
  dayBookingsRef.current = dayBookings;

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      patientId: '',
      therapistId: '',
      therapyId: '',
      roomId: '',
      date: formatDateInput(defaultDate),
      startTime: '',
      notes: '',
    },
    mode: 'onChange',
  });

  const watched = form.watch();
  const selectedTherapy = therapyOptions.find((t) => t.id === watched.therapyId);
  const continuingPlan = patientPackages.find((p) => p.id === continuingPlanId) ?? null;
  const isContinuingPackage = Boolean(continuingPlanId && continuingPlan);
  const selectedTherapist = therapistOptions.find((t) => t.id === watched.therapistId);
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
      approvedLeaves,
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
      approvedLeaves,
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
        approvedLeaves,
        excludeBookingId: mode === 'edit' && booking ? booking.id : undefined,
        overrideScheduleConstraints,
      }),
    [
      watched.date,
      selectedTherapy,
      selectedTherapist,
      availability,
      previewBookings,
      approvedLeaves,
      mode,
      booking,
      overrideScheduleConstraints,
    ],
  );

  const scheduleSlots = useMemo(
    () =>
      computeScheduleSlots({
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
    () => scheduleSlots.filter((slot) => slot.available).map((slot) => slot.startTime),
    [scheduleSlots],
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

  const hasBlockingIssues = hasBlockingSlotIssues(availabilityIssues, validationOptions);
  const scheduleReady = Boolean(watched.therapistId && watched.therapyId && watched.date);
  const timeReady = Boolean(watched.startTime);
  const showRoomStep = scheduleReady && timeReady;

  const isFormValid =
    form.formState.isValid &&
    !hasBlockingIssues &&
    Boolean(selectedTherapy?.durationMinutes) &&
    Boolean(watched.roomId || mode === 'edit') &&
    (mode === 'edit' ||
      isContinuingPackage ||
      !isPackage ||
      (Boolean(packageSessions.trim()) &&
        Number.parseInt(packageSessions, 10) >= 1));

  const resetForm = useCallback(() => {
    const baseDate = prefill?.date ?? defaultDate;
    if (mode === 'edit' && booking) {
      form.reset({
        patientId: booking.patientId,
        therapistId: booking.therapistId ?? '',
        therapyId: booking.therapyId ?? '',
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
        startTime: prefill?.startTime ?? '',
        notes: '',
      });
      setSelectedPatient(null);
    }
    setStep('form');
    setReviewing(false);
    setConfirming(false);
    setSubmitError(null);
    setAvailability([]);
    setPreviewBookings(dayBookingsRef.current);
    setApprovedLeaves([]);
    setSlotsRefreshing(false);
    setSlotsError(null);
    slotsLoadedForKeyRef.current = null;
    if (slotsBackgroundRefreshTimerRef.current) {
      clearTimeout(slotsBackgroundRefreshTimerRef.current);
      slotsBackgroundRefreshTimerRef.current = null;
    }
    setPatientPackages([]);
    setPackagesLoading(false);
    setContinuingPlanId(null);
    setIsPackage(false);
    setPackageSessions('');
    setPackageValidityDays('365');
  }, [mode, booking, prefill, defaultDate, form]);

  const loadSlotSchedule = useCallback(async () => {
    if (!watched.therapistId || !watched.date) return [];

    const scheduleKey = `${watched.therapistId}:${watched.date}`;
    const requestId = ++slotsRefreshRequestIdRef.current;
    setSlotsRefreshing(true);

    try {
      const date = parseDateInput(watched.date);
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const [slots, bookings, leaveResult] = await Promise.all([
        fetchTherapistAvailability(watched.therapistId),
        fetchBookingsForDateRange(start, end, 250),
        fetchApprovedLeaves(watched.therapistId, start.toISOString(), end.toISOString()),
      ]);

      if (requestId !== slotsRefreshRequestIdRef.current) {
        return [];
      }

      setAvailability(slots);
      setPreviewBookings(bookings);
      setApprovedLeaves(
        leaveResult.leaves.map((leave) => ({
          startDateTime: leave.startDateTime,
          endDateTime: leave.endDateTime,
          isFullDay: leave.isFullDay,
        })),
      );
      slotsLoadedForKeyRef.current = scheduleKey;
      setSlotsError(null);
      return bookings;
    } catch (err) {
      if (requestId !== slotsRefreshRequestIdRef.current) {
        return [];
      }
      setSlotsError(err instanceof Error ? err.message : 'Failed to refresh available slots');
      return [];
    } finally {
      if (requestId === slotsRefreshRequestIdRef.current) {
        setSlotsRefreshing(false);
      }
    }
  }, [watched.therapistId, watched.date]);

  const scheduleBackgroundSlotRefresh = useCallback(() => {
    if (slotsBackgroundRefreshTimerRef.current) {
      clearTimeout(slotsBackgroundRefreshTimerRef.current);
    }
    slotsBackgroundRefreshTimerRef.current = setTimeout(() => {
      slotsBackgroundRefreshTimerRef.current = null;
      void loadSlotSchedule();
    }, 400);
  }, [loadSlotSchedule]);

  const handleManualSlotRefresh = useCallback(() => {
    if (slotsBackgroundRefreshTimerRef.current) {
      clearTimeout(slotsBackgroundRefreshTimerRef.current);
      slotsBackgroundRefreshTimerRef.current = null;
    }
    void loadSlotSchedule();
  }, [loadSlotSchedule]);

  const resetFormRef = useRef(resetForm);
  resetFormRef.current = resetForm;

  useEffect(() => {
    if (!open) return;
    resetFormRef.current();
  }, [open]);

  useEffect(() => {
    setTherapyOptions(therapies);
  }, [therapies]);

  useEffect(() => {
    setTherapistOptions(therapists);
  }, [therapists]);

  useEffect(() => {
    if (!open || scheduleReady) return;
    setPreviewBookings(dayBookings);
  }, [open, dayBookings, scheduleReady]);

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
    if (!open || mode !== 'create' || !watched.patientId) {
      setPatientPackages([]);
      setContinuingPlanId(null);
      return;
    }
    let cancelled = false;
    setPackagesLoading(true);
    void getActivePatientPackages(watched.patientId)
      .then(({ treatmentPlans }) => {
        if (cancelled) return;
        setPatientPackages(treatmentPlans);
      })
      .catch(() => {
        if (!cancelled) setPatientPackages([]);
      })
      .finally(() => {
        if (!cancelled) setPackagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, mode, watched.patientId]);

  const handleContinuePackage = useCallback(
    (plan: TreatmentPlan | null) => {
      if (!plan) {
        setContinuingPlanId(null);
        return;
      }
      setContinuingPlanId(plan.id);
      setIsPackage(false);
      setPackageSessions('');
      form.setValue('therapyId', plan.therapyId, { shouldValidate: true });
      const therapistId = getLastTherapistIdFromPlan(plan);
      if (therapistId) {
        form.setValue('therapistId', therapistId, { shouldValidate: true });
      }
    },
    [form],
  );

  useEffect(() => {
    if (!open || mode !== 'create' || isContinuingPackage || !watched.therapyId) return;
    const existingForTherapy = patientPackages.some((p) => p.therapyId === watched.therapyId);
    if (selectedTherapy?.isPackageBased && !existingForTherapy) {
      setIsPackage(true);
      if (selectedTherapy.packageSessions) {
        setPackageSessions(String(selectedTherapy.packageSessions));
      }
      if (selectedTherapy.packageValidityDays) {
        setPackageValidityDays(String(selectedTherapy.packageValidityDays));
      }
    }
  }, [open, mode, isContinuingPackage, watched.therapyId, selectedTherapy, patientPackages]);

  useEffect(() => {
    if (!open || !scheduleReady) return;
    setPreviewBookings(dayBookingsRef.current);
    void loadSlotSchedule();
  }, [open, scheduleReady, watched.therapistId, watched.date, loadSlotSchedule]);

  useSocketEvent(
    SocketEvents.LEAVE_UPDATED,
    () => {
      if (open && scheduleReady) scheduleBackgroundSlotRefresh();
    },
    open && scheduleReady,
  );

  useSocketEvent(
    SocketEvents.BOOKING_UPDATED,
    () => {
      if (open && scheduleReady) scheduleBackgroundSlotRefresh();
    },
    open && scheduleReady,
  );

  useSocketEvent(
    SocketEvents.SCHEDULE_UPDATED,
    () => {
      if (open && scheduleReady) scheduleBackgroundSlotRefresh();
    },
    open && scheduleReady,
  );

  useEffect(() => {
    if (!open || mode === 'edit' || overrideScheduleConstraints) return;
    if (watched.startTime && !availableStartTimes.includes(watched.startTime)) {
      form.setValue('startTime', '');
      form.setValue('roomId', '');
    }
  }, [availableStartTimes, watched.startTime, open, mode, overrideScheduleConstraints, form]);

  useEffect(() => {
    if (!open || mode === 'edit') return;
    slotsLoadedForKeyRef.current = null;
    form.setValue('startTime', '');
    form.setValue('roomId', '');
  }, [watched.therapistId, open, mode, form]);

  useEffect(() => {
    if (!open || mode === 'edit') return;
    slotsLoadedForKeyRef.current = null;
    form.setValue('startTime', '');
    form.setValue('roomId', '');
  }, [watched.date, open, mode, form]);

  useEffect(() => {
    if (!open || mode === 'edit') return;
    form.setValue('roomId', '');
  }, [watched.startTime, open, mode, form]);

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

  const handleTherapySearch = useCallback(
    (query: string, page = 1) => searchTherapies(query, page),
    [],
  );

  const handleTherapistSearch = useCallback(
    (query: string, page = 1) => searchTherapists(query, page),
    [],
  );

  const mergeTherapyOption = useCallback((therapy: Therapy) => {
    setTherapyOptions((prev) => {
      if (prev.some((t) => t.id === therapy.id)) return prev;
      return [...prev, therapy].sort((a, b) => a.name.localeCompare(b.name));
    });
  }, []);

  const mergeTherapistOption = useCallback((therapist: Therapist) => {
    setTherapistOptions((prev) => {
      if (prev.some((t) => t.id === therapist.id)) return prev;
      return [...prev, therapist].sort((a, b) =>
        getTherapistName(a).localeCompare(getTherapistName(b)),
      );
    });
  }, []);

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
        ...(continuingPlanId ? { treatmentPlanId: continuingPlanId } : {}),
        ...(isPackage && !continuingPlanId
          ? {
              createNewPackage: true,
              packageSessions: Number.parseInt(packageSessions, 10),
              packageValidityDays:
                Number.parseInt(packageValidityDays, 10) || 365,
            }
          : {}),
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
    if (confirming) return;
    setSubmitError(null);

    const confirmInput: SlotValidationInput = {
      ...slotPreviewInput,
      dayBookings: previewBookings,
    };
    const issues = validateBookingSlot(confirmInput, validationOptions);
    if (hasBlockingSlotIssues(issues, validationOptions)) {
      setSubmitError('This slot is no longer available. Please choose another.');
      setStep('form');
      return;
    }

    setConfirming(true);
    try {
      const saved = await persistBooking();
      onOpenChange(false);
      if (mode === 'create' && saved) {
        const whatsapp = await notifyAfterBookingAction({
          booking: saved,
          eventType: 'SCHEDULED',
        });
        showBookingSuccess(saved, whatsapp);
      }
      onSuccess();
    } catch (err) {
      setSubmitError(getFriendlyErrorMessage(err, 'Failed to save booking'));
    } finally {
      setConfirming(false);
    }
  }

  function handleReviewSubmit() {
    if (actionBusy) return;
    setSubmitError(null);
    void form.handleSubmit(() => {
      void (async () => {
        setReviewing(true);
        try {
          let freshBookings = previewBookings;
          if (scheduleReady) {
            const scheduleKey = `${watched.therapistId}:${watched.date}`;
            if (slotsLoadedForKeyRef.current !== scheduleKey) {
              freshBookings = await loadSlotSchedule();
            }
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
        } catch (err) {
          setSubmitError(
            getFriendlyErrorMessage(err, 'Failed to verify slot availability'),
          );
        } finally {
          setReviewing(false);
        }
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

  function handleDialogOpenChange(next: boolean) {
    if (!next && actionBusy) return;
    onOpenChange(next);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {mode === 'create' ? 'Create a therapy booking' : 'Edit therapy booking details'}
          </DialogDescription>
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
              <Button
                type="button"
                variant="outline"
                disabled={actionBusy}
                onClick={() => setStep('form')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={actionBusy}
                aria-busy={confirming}
              >
                {confirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === 'create' ? 'Creating…' : 'Saving…'}
                  </>
                ) : mode === 'create' ? (
                  'Confirm & Create'
                ) : (
                  'Confirm & Save'
                )}
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

              {mode === 'create' && watched.patientId && (
                <PatientPackagesPanel
                  plans={patientPackages}
                  loading={packagesLoading}
                  selectedPlanId={continuingPlanId}
                  onSelectPlan={handleContinuePackage}
                />
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="therapistId"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Therapist</FormLabel>
                      <FormControl>
                        <TherapistSearch
                          value={field.value}
                          onChange={(therapistId, therapist) => {
                            field.onChange(therapistId);
                            if (therapist) mergeTherapistOption(therapist);
                          }}
                          onSearch={handleTherapistSearch}
                          knownTherapists={therapistOptions}
                          error={!!fieldState.error}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="therapyId"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel>Therapy</FormLabel>
                        {mode === 'create' && !isContinuingPackage && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => setQuickAddTherapyOpen(true)}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Add
                          </Button>
                        )}
                      </div>
                      <FormControl>
                        <TherapySearch
                          value={field.value}
                          onChange={(therapyId, therapy) => {
                            field.onChange(therapyId);
                            if (therapy) mergeTherapyOption(therapy);
                            if (continuingPlanId && therapyId !== continuingPlan?.therapyId) {
                              setContinuingPlanId(null);
                            }
                          }}
                          onSearch={handleTherapySearch}
                          knownTherapies={therapyOptions}
                          disabled={isContinuingPackage}
                          error={!!fieldState.error}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {mode === 'create' && watched.therapyId && !isContinuingPackage && (
                <PackageConfigPanel
                  isPackage={isPackage}
                  onIsPackageChange={setIsPackage}
                  sessions={packageSessions}
                  onSessionsChange={setPackageSessions}
                  validityDays={packageValidityDays}
                  onValidityDaysChange={setPackageValidityDays}
                  defaultSessions={selectedTherapy?.packageSessions}
                />
              )}

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
                          slots={scheduleSlots}
                          durationMinutes={selectedTherapy.durationMinutes}
                          value={field.value}
                          onChange={field.onChange}
                          refreshing={slotsRefreshing}
                          onRefresh={handleManualSlotRefresh}
                        />
                      </FormControl>
                      {field.value && endTime && (
                        <p className="text-xs text-muted-foreground">
                          Ends at {formatTime(endTime)}
                        </p>
                      )}
                      {slotsError && (
                        <p className="text-xs text-destructive">{slotsError}</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {showRoomStep && (
                <FormField
                  control={form.control}
                  name="roomId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                <Button
                  type="button"
                  variant="outline"
                  disabled={actionBusy}
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!isFormValid || actionBusy}
                  aria-busy={reviewing}
                >
                  {reviewing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking availability…
                    </>
                  ) : mode === 'create' ? (
                    'Review Booking'
                  ) : (
                    'Review Changes'
                  )}
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

      <QuickAddTherapyDialog
        open={quickAddTherapyOpen}
        onOpenChange={setQuickAddTherapyOpen}
        onCreated={(therapy) => {
          mergeTherapyOption(therapy);
          onTherapyCreated?.(therapy);
          form.setValue('therapyId', therapy.id, { shouldValidate: true, shouldDirty: true });
        }}
      />

    </>
  );
}
