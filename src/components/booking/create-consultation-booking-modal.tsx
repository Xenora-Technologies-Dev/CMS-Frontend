'use client';

import { AvailableSlotsPicker } from '@/components/booking/available-slots-picker';
import { PatientSearch } from '@/components/booking/patient-search';
import { QuickAddPatientDialog } from '@/components/booking/quick-add-patient-dialog';
import { useToast } from '@/components/providers/toast-provider';
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
import {
  computeConsultationAvailableSlots,
  computeConsultationAvailableWindows,
  getConsultationAvailableRooms,
} from '@/lib/booking-validation';
import { createBooking, fetchBookingsForDate, searchPatients } from '@/lib/booking-api';
import { listPublicHolidays } from '@/lib/holiday-api';
import { getFriendlyErrorMessage } from '@/lib/error-utils';
import type { Booking, BookingMode, Doctor, PublicHoliday, Room } from '@/lib/types';
import {
  combineDateAndTime,
  endOfDay,
  formatDateInput,
  getDoctorColor,
  getDoctorName,
  parseDateInput,
  startOfDay,
} from '@/lib/utils';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

export interface ConsultationSlotPrefill {
  roomId?: string;
  startTime?: string;
  date?: Date;
}

interface CreateConsultationBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: Date;
  doctors: Doctor[];
  rooms: Room[];
  prefill?: ConsultationSlotPrefill;
  onSuccess: () => void;
}

const DURATION_OPTIONS = [15, 30, 45, 60];

export function CreateConsultationBookingModal({
  open,
  onOpenChange,
  defaultDate,
  doctors,
  rooms,
  prefill,
  onSuccess,
}: CreateConsultationBookingModalProps) {
  const { showBookingSuccess } = useToast();
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [date, setDate] = useState(formatDateInput(defaultDate));
  const [time, setTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [bookingMode, setBookingMode] = useState<BookingMode>('WALK_IN');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [dayBookings, setDayBookings] = useState<Booking[]>([]);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === doctorId),
    [doctors, doctorId],
  );

  const loadSchedule = useCallback(async () => {
    if (!date) return;
    setSlotsLoading(true);
    try {
      const bookingDate = parseDateInput(date);
      const [bookings, holidayResult] = await Promise.all([
        fetchBookingsForDate(bookingDate, 200, { bookingType: 'CONSULTATION' }),
        listPublicHolidays({
          limit: 50,
          dateFrom: startOfDay(bookingDate).toISOString(),
          dateTo: endOfDay(bookingDate).toISOString(),
        }),
      ]);
      setDayBookings(bookings);
      setHolidays(holidayResult.data);
    } catch {
      setDayBookings([]);
      setHolidays([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    if (!open) return;
    setPatientId('');
    setDoctorId('');
    setRoomId(prefill?.roomId ?? '');
    setDate(formatDateInput(prefill?.date ?? defaultDate));
    setTime(prefill?.startTime ?? '');
    setDurationMinutes(15);
    setBookingMode('WALK_IN');
    setNotes('');
    setError(null);
  }, [open, prefill, defaultDate]);

  useEffect(() => {
    if (!open || !date) return;
    void loadSchedule();
  }, [open, date, loadSchedule]);

  const availableWindows = useMemo(
    () =>
      computeConsultationAvailableWindows({
        date,
        durationMinutes,
        doctor: selectedDoctor,
        dayBookings,
        holidays,
      }),
    [date, durationMinutes, selectedDoctor, dayBookings, holidays],
  );

  const availableSlots = useMemo(
    () =>
      computeConsultationAvailableSlots({
        windows: availableWindows,
        durationMinutes,
        date,
        dayBookings,
        doctorId: doctorId || undefined,
        roomId: roomId || undefined,
      }),
    [availableWindows, durationMinutes, date, dayBookings, doctorId, roomId],
  );

  const availableStartTimes = useMemo(
    () => availableSlots.map((slot) => slot.startTime),
    [availableSlots],
  );

  const availableRooms = useMemo(
    () =>
      getConsultationAvailableRooms(rooms, dayBookings, date, time, durationMinutes),
    [rooms, dayBookings, date, time, durationMinutes],
  );

  const scheduleReady = Boolean(date && doctorId && durationMinutes);

  useEffect(() => {
    if (!open || slotsLoading) return;
    if (time && !availableStartTimes.includes(time)) {
      setTime('');
    }
  }, [availableStartTimes, time, open, slotsLoading]);

  useEffect(() => {
    if (!open) return;
    if (roomId && !availableRooms.some((r) => r.id === roomId)) {
      setRoomId('');
    }
  }, [availableRooms, roomId, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId || !doctorId || !roomId || !time) {
      setError('Patient, doctor, room, and time slot are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const startTime = combineDateAndTime(parseDateInput(date), time);
      const { booking } = await createBooking({
        bookingType: 'CONSULTATION',
        patientId,
        doctorId,
        roomId,
        bookingMode,
        durationMinutes,
        startTime: startTime.toISOString(),
        notes: notes.trim() || undefined,
      });
      onOpenChange(false);
      showBookingSuccess(booking);
      onSuccess();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to create consultation booking'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Consultation Booking</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Patient *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => setQuickAddOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Quick add
                </Button>
              </div>
              <PatientSearch
                value={patientId}
                onChange={setPatientId}
                onSearch={searchPatients}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="consult-date">Date *</Label>
              <Input
                id="consult-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Doctor *</Label>
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

            <div className="space-y-2">
              <Label>Duration *</Label>
              <Select
                value={String(durationMinutes)}
                onValueChange={(v) => setDurationMinutes(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {scheduleReady && (
              <div className="space-y-2">
                <Label>Time slot *</Label>
                <AvailableSlotsPicker
                  windows={availableWindows}
                  slots={availableSlots}
                  durationMinutes={durationMinutes}
                  value={time}
                  onChange={setTime}
                  loading={slotsLoading}
                  resourceLabel="doctor"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Room *</Label>
              <Select
                value={roomId}
                onValueChange={setRoomId}
                disabled={!time}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={time ? 'Select consultation room' : 'Choose a time slot first'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {(time ? availableRooms : rooms).map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                      {room.code ? ` (${room.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {time && availableRooms.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No consultation rooms free at this time.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Mode *</Label>
              <Select
                value={bookingMode}
                onValueChange={(v) => setBookingMode(v as BookingMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WALK_IN">Walk-In</SelectItem>
                  <SelectItem value="CALL">Call</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="consult-remarks">Remarks</Label>
              <Textarea
                id="consult-remarks"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes for this consultation"
              />
            </div>

            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !time}>
                {saving ? 'Creating…' : 'Create Booking'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <QuickAddPatientDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onCreated={(patient) => {
          setPatientId(patient.id);
          setQuickAddOpen(false);
        }}
      />
    </>
  );
}
