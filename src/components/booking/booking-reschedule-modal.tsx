'use client';

import { AvailableSlotsPicker } from '@/components/booking/available-slots-picker';
import { SlotOccupancyPreview } from '@/components/booking/slot-occupancy-preview';
import {
  BookingConflictAlert,
  parseConflictDetails,
} from '@/components/booking/booking-conflict-alert';
import { useClinicOptional } from '@/components/providers/clinic-provider';
import { useSocketEvent } from '@/components/providers/socket-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  fetchBookingsForDate,
  fetchBookingsForDateRange,
  fetchTherapistAvailability,
  rescheduleBooking,
} from '@/lib/booking-api';
import { isAllowBookingOutsideConsultationHoursEnabled } from '@/lib/clinic-api';
import { fetchApprovedLeaves } from '@/lib/leave-api';
import { listPublicHolidays } from '@/lib/holiday-api';
import {
  computeAvailableWindows,
  computeConsultationAvailableWindows,
  computeConsultationScheduleSlots,
  computeEndTimeFromSlot,
  computeScheduleSlots,
  getAvailableRooms,
  getConsultationAvailableRooms,
  hasBlockingSlotIssues,
  validateBookingSlot,
  type ApprovedLeaveBlock,
  type SlotValidationInput,
} from '@/lib/booking-validation';
import { SocketEvents } from '@/lib/socket-events';
import type { Booking, Doctor, PublicHoliday, Room, Therapist } from '@/lib/types';
import {
  combineDateAndTime,
  endOfDay,
  formatDateInput,
  formatDuration,
  formatTime,
  getDoctorColor,
  getDoctorName,
  getPatientName,
  getTherapistName,
  parseDateInput,
  startOfDay,
  toTimeInputValue,
} from '@/lib/utils';
import { useToast } from '@/components/providers/toast-provider';
import { useBookingWhatsApp } from '@/components/whatsapp/booking-whatsapp-provider';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface BookingRescheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  therapists: Therapist[];
  doctors?: Doctor[];
  rooms: Room[];
  onSuccess: (newStartTime?: string) => void;
}

function filterRoomsByBookingType(rooms: Room[], bookingType?: Booking['bookingType']): Room[] {
  if (bookingType === 'CONSULTATION') {
    return rooms.filter((room) => room.roomType === 'CONSULTATION');
  }
  return rooms.filter((room) => room.roomType === 'THERAPY' || !room.roomType);
}

export function BookingRescheduleModal({
  open,
  onOpenChange,
  booking,
  therapists,
  doctors = [],
  rooms,
  onSuccess,
}: BookingRescheduleModalProps) {
  const { showBookingAction } = useToast();
  const { notifyAfterBookingAction } = useBookingWhatsApp();
  const clinicContext = useClinicOptional();
  const isConsultation = booking?.bookingType === 'CONSULTATION';
  const overrideScheduleConstraints = isAllowBookingOutsideConsultationHoursEnabled(
    clinicContext?.clinic,
  );

  const [dateValue, setDateValue] = useState('');
  const [therapistId, setTherapistId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [time, setTime] = useState('');
  const [availability, setAvailability] = useState<
    import('@/lib/types').TherapistAvailability[]
  >([]);
  const [dayBookings, setDayBookings] = useState<Booking[]>([]);
  const [approvedLeaves, setApprovedLeaves] = useState<ApprovedLeaveBlock[]>([]);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [slotsRefreshing, setSlotsRefreshing] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflictDetails, setConflictDetails] = useState<ReturnType<typeof parseConflictDetails>>(null);
  const [loading, setLoading] = useState(false);
  const slotsLoadedForKeyRef = useRef<string | null>(null);
  const slotsRefreshRequestIdRef = useRef(0);
  const slotsBackgroundRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStaffIdRef = useRef<string | null>(null);
  const prevDateValueRef = useRef<string | null>(null);
  const prevTimeRef = useRef<string | null>(null);

  const typedRooms = useMemo(
    () => filterRoomsByBookingType(rooms, booking?.bookingType),
    [rooms, booking?.bookingType],
  );

  const selectedTherapist = therapists.find((t) => t.id === therapistId);
  const selectedDoctor = doctors.find((d) => d.id === doctorId);
  const durationMinutes = booking?.durationMinutes ?? booking?.therapy?.durationMinutes ?? 0;
  const staffId = isConsultation ? doctorId : therapistId;
  const scheduleReady = Boolean(staffId && dateValue && durationMinutes);

  const endTime = useMemo(() => {
    if (!dateValue || !time || !durationMinutes) return null;
    return computeEndTimeFromSlot(dateValue, time, durationMinutes);
  }, [dateValue, time, durationMinutes]);

  const therapyWindows = useMemo(
    () =>
      computeAvailableWindows({
        date: dateValue,
        durationMinutes,
        therapist: selectedTherapist,
        availability,
        dayBookings,
        approvedLeaves,
        excludeBookingId: booking?.id,
        overrideScheduleConstraints,
      }),
    [
      dateValue,
      durationMinutes,
      selectedTherapist,
      availability,
      dayBookings,
      approvedLeaves,
      booking?.id,
      overrideScheduleConstraints,
    ],
  );

  const consultationWindows = useMemo(
    () =>
      computeConsultationAvailableWindows({
        date: dateValue,
        durationMinutes,
        doctor: selectedDoctor,
        dayBookings,
        holidays,
        excludeBookingId: booking?.id,
      }),
    [dateValue, durationMinutes, selectedDoctor, dayBookings, holidays, booking?.id],
  );

  const availableWindows = isConsultation ? consultationWindows : therapyWindows;

  const scheduleSlots = useMemo(() => {
    if (isConsultation) {
      return computeConsultationScheduleSlots({
        windows: consultationWindows,
        durationMinutes,
        date: dateValue,
        dayBookings,
        doctorId: doctorId || undefined,
        excludeBookingId: booking?.id,
      });
    }
    return computeScheduleSlots({
      windows: therapyWindows,
      durationMinutes,
      date: dateValue,
      dayBookings,
      therapistId,
      excludeBookingId: booking?.id,
    });
  }, [
    isConsultation,
    consultationWindows,
    therapyWindows,
    durationMinutes,
    dateValue,
    dayBookings,
    doctorId,
    therapistId,
    booking?.id,
  ]);

  const availableStartTimes = useMemo(
    () => scheduleSlots.filter((slot) => slot.available).map((slot) => slot.startTime),
    [scheduleSlots],
  );

  const availableRooms = useMemo(() => {
    if (isConsultation) {
      return getConsultationAvailableRooms(
        typedRooms,
        dayBookings,
        dateValue,
        time,
        durationMinutes,
        booking?.id,
      );
    }
    return getAvailableRooms(
      typedRooms,
      dayBookings,
      dateValue,
      time,
      durationMinutes,
      booking?.id,
    );
  }, [isConsultation, typedRooms, dayBookings, dateValue, time, durationMinutes, booking?.id]);

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
      approvedLeaves,
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
      approvedLeaves,
      booking?.id,
    ],
  );

  const validationOptions = useMemo(
    () => ({ overrideScheduleConstraints: isConsultation ? false : overrideScheduleConstraints }),
    [isConsultation, overrideScheduleConstraints],
  );

  const issues = useMemo(
    () => (isConsultation ? [] : validateBookingSlot(validationInput, validationOptions)),
    [isConsultation, validationInput, validationOptions],
  );
  const hasErrors = isConsultation
    ? !time || !roomId || !availableStartTimes.includes(time)
    : hasBlockingSlotIssues(issues, validationOptions);

  const loadSlotSchedule = useCallback(async () => {
    if (!staffId || !dateValue) return [];

    const scheduleKey = `${staffId}:${dateValue}`;
    const requestId = ++slotsRefreshRequestIdRef.current;
    setSlotsRefreshing(true);

    try {
      const date = parseDateInput(dateValue);
      const start = startOfDay(date);
      const end = endOfDay(date);

      if (isConsultation) {
        const [bookings, holidayResult] = await Promise.all([
          fetchBookingsForDate(date, 250, { bookingType: 'CONSULTATION' }),
          listPublicHolidays({
            limit: 50,
            dateFrom: start.toISOString(),
            dateTo: end.toISOString(),
          }),
        ]);

        if (requestId !== slotsRefreshRequestIdRef.current) return [];

        setDayBookings(bookings);
        setHolidays(holidayResult.data);
        setAvailability([]);
        setApprovedLeaves([]);
        slotsLoadedForKeyRef.current = scheduleKey;
        setSlotsError(null);
        return bookings;
      }

      const [slots, bookings, leaveResult] = await Promise.all([
        fetchTherapistAvailability(therapistId),
        fetchBookingsForDateRange(start, end, 250),
        fetchApprovedLeaves(therapistId, start.toISOString(), end.toISOString()),
      ]);

      if (requestId !== slotsRefreshRequestIdRef.current) return [];

      setAvailability(slots);
      setDayBookings(bookings);
      setApprovedLeaves(
        leaveResult.leaves.map((leave) => ({
          startDateTime: leave.startDateTime,
          endDateTime: leave.endDateTime,
          isFullDay: leave.isFullDay,
        })),
      );
      setHolidays([]);
      slotsLoadedForKeyRef.current = scheduleKey;
      setSlotsError(null);
      return bookings;
    } catch (err) {
      if (requestId !== slotsRefreshRequestIdRef.current) return [];
      setSlotsError(err instanceof Error ? err.message : 'Failed to refresh available slots');
      return [];
    } finally {
      if (requestId === slotsRefreshRequestIdRef.current) {
        setSlotsRefreshing(false);
      }
    }
  }, [staffId, dateValue, isConsultation, therapistId]);

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

  useEffect(() => {
    if (!open || !booking) return;
    const start = new Date(booking.startTime);
    setDateValue(formatDateInput(start));
    setTherapistId(booking.therapistId ?? '');
    setDoctorId(booking.doctorId ?? '');
    setRoomId(booking.roomId);
    setTime(toTimeInputValue(booking.startTime));
    setAvailability([]);
    setDayBookings([]);
    setApprovedLeaves([]);
    setHolidays([]);
    setSlotsRefreshing(false);
    setSlotsError(null);
    setError(null);
    setConflictDetails(null);
    slotsLoadedForKeyRef.current = null;
    if (slotsBackgroundRefreshTimerRef.current) {
      clearTimeout(slotsBackgroundRefreshTimerRef.current);
      slotsBackgroundRefreshTimerRef.current = null;
    }
    prevStaffIdRef.current = isConsultation ? (booking.doctorId ?? null) : (booking.therapistId ?? null);
    prevDateValueRef.current = formatDateInput(start);
    prevTimeRef.current = toTimeInputValue(booking.startTime);
  }, [open, booking, isConsultation]);

  useEffect(() => {
    if (!open || !scheduleReady) return;
    void loadSlotSchedule();
  }, [open, scheduleReady, staffId, dateValue, loadSlotSchedule]);

  useSocketEvent(
    SocketEvents.LEAVE_UPDATED,
    () => {
      if (open && scheduleReady && !isConsultation) scheduleBackgroundSlotRefresh();
    },
    open && scheduleReady && !isConsultation,
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
    if (!open || isConsultation || overrideScheduleConstraints) return;
    if (time && !availableStartTimes.includes(time)) {
      setTime('');
      setRoomId('');
    }
  }, [availableStartTimes, time, open, overrideScheduleConstraints, isConsultation]);

  useEffect(() => {
    if (!open || !isConsultation) return;
    if (time && !availableStartTimes.includes(time)) {
      setTime('');
      setRoomId('');
    }
  }, [availableStartTimes, time, open, isConsultation]);

  useEffect(() => {
    if (!open) {
      prevStaffIdRef.current = null;
      return;
    }
    if (prevStaffIdRef.current && prevStaffIdRef.current !== staffId) {
      slotsLoadedForKeyRef.current = null;
      setTime('');
      setRoomId('');
    }
    prevStaffIdRef.current = staffId;
  }, [staffId, open]);

  useEffect(() => {
    if (!open) {
      prevDateValueRef.current = null;
      return;
    }
    if (prevDateValueRef.current && prevDateValueRef.current !== dateValue) {
      slotsLoadedForKeyRef.current = null;
      setTime('');
      setRoomId('');
    }
    prevDateValueRef.current = dateValue;
  }, [dateValue, open]);

  useEffect(() => {
    if (!open) {
      prevTimeRef.current = null;
      return;
    }
    if (prevTimeRef.current && prevTimeRef.current !== time) {
      setRoomId('');
    }
    prevTimeRef.current = time;
  }, [time, open]);

  useEffect(() => {
    if (!open || !time) return;
    if (roomId && !availableRooms.some((room) => room.id === roomId)) {
      setRoomId('');
    }
  }, [availableRooms, roomId, time, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!booking || hasErrors || !time || !roomId) {
      setError('Select an available slot and room before postponing');
      return;
    }
    setLoading(true);
    setError(null);
    setConflictDetails(null);
    try {
      const freshBookings = await loadSlotSchedule();

      if (!isConsultation) {
        const confirmIssues = validateBookingSlot(
          { ...validationInput, dayBookings: freshBookings },
          validationOptions,
        );
        if (hasBlockingSlotIssues(confirmIssues, validationOptions)) {
          setError('This slot is no longer available. Please choose another.');
          return;
        }
      } else {
        const freshSlots = computeConsultationScheduleSlots({
          windows: computeConsultationAvailableWindows({
            date: dateValue,
            durationMinutes,
            doctor: selectedDoctor,
            dayBookings: freshBookings,
            holidays,
            excludeBookingId: booking.id,
          }),
          durationMinutes,
          date: dateValue,
          dayBookings: freshBookings,
          doctorId: doctorId || undefined,
          excludeBookingId: booking.id,
        });
        if (!freshSlots.some((slot) => slot.startTime === time && slot.available)) {
          setError('This slot is no longer available. Please choose another.');
          return;
        }
      }

      const previousStartTime = booking.startTime;
      const payload = {
        startTime: combineDateAndTime(parseDateInput(dateValue), time).toISOString(),
        roomId,
        ...(isConsultation ? { doctorId } : { therapistId }),
      };
      const { booking: updated } = await rescheduleBooking(booking.id, payload);
      onOpenChange(false);
      const whatsapp = await notifyAfterBookingAction({
        booking: updated,
        eventType: 'RESCHEDULED',
        previousStartTime,
      });
      showBookingAction({
        action: 'postpone',
        booking: updated,
        previousStartTime,
        whatsapp,
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

  const currentRoom =
    typedRooms.find((r) => r.id === booking.roomId) ?? booking.room;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Postpone Appointment</DialogTitle>
          <DialogDescription className="sr-only">
            Choose a new date, time, {isConsultation ? 'doctor' : 'therapist'}, and room for this
            appointment
          </DialogDescription>
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
                <dt className="text-xs uppercase">{isConsultation ? 'Type' : 'Therapy'}</dt>
                <dd className="font-medium text-slate-800">
                  {isConsultation ? 'Consultation' : (booking.therapy?.name ?? '—')}
                </dd>
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
                <dt className="text-xs uppercase">{isConsultation ? 'Doctor' : 'Therapist'}</dt>
                <dd className="font-medium text-slate-800">
                  {isConsultation
                    ? booking.doctor
                      ? getDoctorName(booking.doctor)
                      : '—'
                    : booking.therapist
                      ? getTherapistName(booking.therapist)
                      : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase">Room</dt>
                <dd className="font-medium text-slate-800">{currentRoom?.name ?? '—'}</dd>
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

          {isConsultation ? (
            <div className="space-y-2">
              <Label>Doctor</Label>
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: getDoctorColor(doctor.colorCode) }}
                        />
                        {getDoctorName(doctor)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
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
          )}

          {scheduleReady && durationMinutes > 0 && (
            <div className="space-y-2">
              <Label>Time</Label>
              <AvailableSlotsPicker
                windows={availableWindows}
                slots={scheduleSlots}
                durationMinutes={durationMinutes}
                value={time}
                onChange={setTime}
                refreshing={slotsRefreshing}
                onRefresh={handleManualSlotRefresh}
                resourceLabel={isConsultation ? 'doctor' : 'therapist'}
              />
              {time && endTime && (
                <p className="text-xs text-muted-foreground">
                  Ends at {formatTime(endTime)} ({formatDuration(durationMinutes)})
                </p>
              )}
              {slotsError && <p className="text-xs text-destructive">{slotsError}</p>}
            </div>
          )}

          {time && (
            <div className="space-y-2">
              <Label>{isConsultation ? 'Consultation Room' : 'Therapy Room'}</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {availableRooms.map((room) => {
                    const fullRoom = typedRooms.find((r) => r.id === room.id);
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
                  No {isConsultation ? 'consultation' : 'therapy'} rooms free at this time. Pick
                  another slot.
                </p>
              )}
            </div>
          )}

          {!isConsultation && time && roomId && (
            <SlotOccupancyPreview input={validationInput} issues={issues} />
          )}

          <BookingConflictAlert details={conflictDetails} fallbackMessage={error ?? undefined} />

          {error && !conflictDetails && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="submit" disabled={loading || hasErrors || !time || !roomId}>
              {loading ? 'Postponing…' : 'Confirm Postpone'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
