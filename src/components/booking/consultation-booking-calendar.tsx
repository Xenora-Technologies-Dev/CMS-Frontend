'use client';

import {
  cancelBooking,
  completeBooking,
  fetchBookingsForDate,
} from '@/lib/booking-api';
import { listDoctors } from '@/lib/doctor-api';
import { listPublicHolidays } from '@/lib/holiday-api';
import { listRooms } from '@/lib/room-api';
import type { Booking, Doctor, PublicHoliday, Room } from '@/lib/types';
import {
  cn,
  endOfDay,
  formatDate,
  formatDateInput,
  getDoctorColor,
  getDoctorName,
  parseDateInput,
  startOfDay,
} from '@/lib/utils';
import {
  BookingDetailDialog,
  CancelBookingDialog,
} from '@/components/booking/booking-dialogs';
import {
  CreateConsultationBookingModal,
  type ConsultationSlotPrefill,
} from '@/components/booking/create-consultation-booking-modal';
import { BookingTimeline } from '@/components/booking/booking-timeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/providers/toast-provider';
import { useBookingWhatsApp } from '@/components/whatsapp/booking-whatsapp-provider';
import { useSocketEvent } from '@/components/providers/socket-provider';
import { useClinicOptional } from '@/components/providers/clinic-provider';
import { formatClinicLocation, getClinicDisplayName } from '@/lib/clinic-api';
import { SocketEvents } from '@/lib/socket-events';

const RESOURCE_LIMIT = 100;

interface ConsultationBookingCalendarProps {
  lockedDoctorId?: string;
  hideTitle?: boolean;
}

export function ConsultationBookingCalendar({
  lockedDoctorId,
  hideTitle,
}: ConsultationBookingCalendarProps = {}) {
  const { showBookingAction } = useToast();
  const { notifyAfterBookingAction } = useBookingWhatsApp();
  const clinicContext = useClinicOptional();
  const clinic = clinicContext?.clinic;
  const clinicName = getClinicDisplayName(clinic);
  const clinicLocation = clinic ? formatClinicLocation(clinic) : null;
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);
  const loadRequestIdRef = useRef(0);

  const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>(
    lockedDoctorId ? [lockedDoctorId] : [],
  );
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [slotPrefill, setSlotPrefill] = useState<ConsultationSlotPrefill | undefined>();
  const [cancelOpen, setCancelOpen] = useState(false);

  const activeBookings = useMemo(
    () => bookings.filter((b) => !['CANCELLED', 'RESCHEDULED', 'NO_SHOW'].includes(b.status)),
    [bookings],
  );

  const filteredBookings = useMemo(() => {
    let result = activeBookings;
    if (selectedDoctorIds.length > 0) {
      result = result.filter((b) => b.doctorId && selectedDoctorIds.includes(b.doctorId));
    }
    if (selectedRoomIds.length > 0) {
      result = result.filter((b) => selectedRoomIds.includes(b.roomId));
    }
    return result;
  }, [activeBookings, selectedDoctorIds, selectedRoomIds]);

  const filteredRooms = useMemo(() => {
    if (selectedRoomIds.length === 0) return rooms;
    return rooms.filter((r) => selectedRoomIds.includes(r.id));
  }, [rooms, selectedRoomIds]);

  const loadData = useCallback(
    async (options?: { background?: boolean }) => {
      const requestId = ++loadRequestIdRef.current;
      const isBackground = options?.background && hasLoadedOnce.current;
      if (isBackground) {
        setRefreshing(true);
      } else if (!hasLoadedOnce.current) {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
        setBookings([]);
        setHolidays([]);
      }
      setError(null);
      try {
        const [dayBookings, doctorResult, roomResult, holidayResult] = await Promise.all([
          fetchBookingsForDate(selectedDate, RESOURCE_LIMIT, {
            bookingType: 'CONSULTATION',
            doctorId: lockedDoctorId,
          }),
          listDoctors({ limit: RESOURCE_LIMIT, isActive: true }),
          listRooms({ limit: RESOURCE_LIMIT, isActive: true, roomType: 'CONSULTATION' }),
          listPublicHolidays({
            limit: RESOURCE_LIMIT,
            dateFrom: startOfDay(selectedDate).toISOString(),
            dateTo: endOfDay(selectedDate).toISOString(),
          }),
        ]);
        if (requestId !== loadRequestIdRef.current) return;
        setBookings(dayBookings);
        setDoctors(
          lockedDoctorId
            ? doctorResult.data.filter((d) => d.id === lockedDoctorId)
            : doctorResult.data,
        );
        setRooms(roomResult.data);
        setHolidays(holidayResult.data);
        hasLoadedOnce.current = true;
      } catch (err) {
        if (requestId !== loadRequestIdRef.current) return;
        setError(err instanceof Error ? err.message : 'Failed to load calendar data');
      } finally {
        if (requestId !== loadRequestIdRef.current) return;
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [selectedDate, lockedDoctorId],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const debouncedBackgroundReload = useDebouncedCallback(() => {
    void loadData({ background: true });
  }, 600);

  useSocketEvent(SocketEvents.BOOKING_UPDATED, debouncedBackgroundReload);

  useSocketEvent(SocketEvents.SCHEDULE_UPDATED, debouncedBackgroundReload);

  useEffect(() => {
    if (lockedDoctorId) {
      setSelectedDoctorIds([lockedDoctorId]);
    }
  }, [lockedDoctorId]);

  function handleDoctorToggle(id: string) {
    if (lockedDoctorId) return;
    setSelectedDoctorIds((current) =>
      current.includes(id) ? current.filter((d) => d !== id) : [...current, id],
    );
  }

  function handleRoomToggle(id: string) {
    setSelectedRoomIds((current) =>
      current.includes(id) ? current.filter((r) => r !== id) : [...current, id],
    );
  }

  function shiftDate(days: number) {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + days);
    setSelectedDate(next);
  }

  const sidebarDateLabel = formatDate(selectedDate);

  function handleSelectBooking(booking: Booking) {
    setSelectedBooking(booking);
    setDetailOpen(true);
  }

  function openCreate(prefill?: ConsultationSlotPrefill) {
    setSlotPrefill(prefill);
    setFormOpen(true);
  }

  function handleEmptySlotClick(roomId: string, time: string) {
    openCreate({ roomId, startTime: time, date: selectedDate });
  }

  async function handleCancel(reason: string) {
    if (!selectedBooking) return;
    const { booking: updated } = await cancelBooking(selectedBooking.id, {
      cancellationReason: reason || undefined,
    });
    setCancelOpen(false);
    setDetailOpen(false);
    const whatsapp = await notifyAfterBookingAction({
      booking: updated,
      eventType: 'CANCELLED',
    });
    showBookingAction({
      action: 'cancel',
      booking: updated,
      cancellationReason: reason || undefined,
      whatsapp,
    });
    await loadData({ background: true });
  }

  async function handleComplete() {
    if (!selectedBooking) return;
    await completeBooking(selectedBooking.id);
    setDetailOpen(false);
    await loadData({ background: true });
  }

  const dateLabel = formatDate(selectedDate);

  const resourcesReady = doctors.length > 0 && rooms.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {!hideTitle && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Consultation Booking</h1>
            <p className="text-sm text-muted-foreground">
              Daily view · consultation rooms · doctor color coding
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => void loadData()}
            aria-label="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4', (initialLoading || refreshing) && 'animate-spin')} />
          </Button>
          {!lockedDoctorId && (
            <Button onClick={() => openCreate()} disabled={!resourcesReady}>
              <Plus className="h-4 w-4" />
              Create Booking
            </Button>
          )}
        </div>
      </div>

      {!resourcesReady && !initialLoading && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Add at least one active doctor and consultation room before creating bookings.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="xl:w-64 xl:shrink-0">
          <div className="space-y-4 rounded-lg border bg-white p-4 shadow-sm xl:sticky xl:top-6">
            <div className="space-y-2">
              <Label htmlFor="consult-cal-date" className="text-xs font-semibold uppercase text-muted-foreground">
                Date
              </Label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => shiftDate(-1)}
                  aria-label="Previous day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Input
                  id="consult-cal-date"
                  type="date"
                  value={formatDateInput(selectedDate)}
                  onChange={(e) => setSelectedDate(parseDateInput(e.target.value))}
                  className="h-8 flex-1 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => shiftDate(1)}
                  aria-label="Next day"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{sidebarDateLabel}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </Button>
            </div>
            {!lockedDoctorId && doctors.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Doctors
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {doctors.map((doctor) => (
                    <button
                      key={doctor.id}
                      type="button"
                      onClick={() => handleDoctorToggle(doctor.id)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs',
                        selectedDoctorIds.includes(doctor.id)
                          ? 'border-violet-600 bg-violet-50 text-violet-800'
                          : 'hover:bg-slate-50',
                      )}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: getDoctorColor(doctor.colorCode) }}
                      />
                      {getDoctorName(doctor)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {rooms.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Rooms
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {rooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => handleRoomToggle(room.id)}
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-xs',
                        selectedRoomIds.includes(room.id)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'hover:bg-slate-50',
                      )}
                    >
                      {room.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="rounded-lg border bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
              <p className="text-sm font-medium text-slate-700">{dateLabel}</p>
              {(clinicName || clinicLocation || clinic?.phone) && (
                <p className="text-xs text-muted-foreground">
                  {[clinicName, clinicLocation, clinic?.phone].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {filteredBookings.length} active consultation
              {filteredBookings.length === 1 ? '' : 's'}
              {(selectedDoctorIds.length > 0 || selectedRoomIds.length > 0) && ' (filtered)'}
              {!lockedDoctorId && ' · Click an empty cell to book'}
              {lockedDoctorId && ' · View-only schedule'}
            </p>
          </div>

          {(initialLoading || refreshing) && bookings.length === 0 ? (
            <div className="rounded-lg border p-12 text-center text-sm text-muted-foreground">
              Loading schedule…
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
              No consultation rooms available. Add consultation rooms in Room Management.
            </div>
          ) : (
            <>
              <BookingTimeline
                rooms={filteredRooms}
                bookings={filteredBookings}
                selectedDate={selectedDate}
                holidays={holidays}
                onSelectBooking={handleSelectBooking}
                onEmptySlotClick={
                  !lockedDoctorId && resourcesReady ? handleEmptySlotClick : undefined
                }
                showBookingActions={!lockedDoctorId}
                onCancelBooking={(booking) => {
                  setSelectedBooking(booking);
                  setCancelOpen(true);
                }}
              />
            </>
          )}
        </div>
      </div>

      <BookingDetailDialog
        booking={selectedBooking}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setCancelOpen(true);
        }}
        onComplete={lockedDoctorId ? undefined : handleComplete}
        viewerRole={lockedDoctorId ? 'doctor' : 'admin'}
      />

      <CreateConsultationBookingModal
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultDate={selectedDate}
        doctors={doctors}
        rooms={rooms}
        prefill={slotPrefill}
        onSuccess={() => void loadData({ background: true })}
      />

      <CancelBookingDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onSubmit={handleCancel}
      />
    </div>
  );
}
