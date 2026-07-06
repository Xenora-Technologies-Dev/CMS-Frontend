'use client';

import {
  buildCancelBookingPayload,
  cancelBooking,
  completeBooking,
  fetchBookingsForDate,
} from '@/lib/booking-api';
import { listRooms } from '@/lib/room-api';
import { listTherapists } from '@/lib/therapist-api';
import { listTherapies } from '@/lib/therapy-api';
import { listPublicHolidays } from '@/lib/holiday-api';
import type { Booking, PublicHoliday, Room, Therapist, Therapy } from '@/lib/types';
import { canRequestBookingEdit, isCompletedBookingEdit } from '@/lib/appointment-list-utils';
import { COMPLETED_BOOKING_PASSWORD } from '@/components/booking/booking-constants';
import { cn, endOfDay, formatDate, getTherapistName, startOfDay } from '@/lib/utils';
import { CalendarFilters } from '@/components/booking/calendar-filters';
import {
  BookingDetailDialog,
  CancelBookingDialog,
  CompletedBookingPasswordDialog,
} from '@/components/booking/booking-dialogs';
import { BookingFormModal, type BookingSlotPrefill } from '@/components/booking/booking-form-modal';
import { BookingRescheduleModal } from '@/components/booking/booking-reschedule-modal';
import { BookingTimeline } from '@/components/booking/booking-timeline';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, RefreshCw } from 'lucide-react';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/providers/toast-provider';
import { useBookingWhatsApp } from '@/components/whatsapp/booking-whatsapp-provider';
import { useSocketEvent } from '@/components/providers/socket-provider';
import { useClinicOptional } from '@/components/providers/clinic-provider';
import { formatClinicLocation, getClinicDisplayName } from '@/lib/clinic-api';
import { SocketEvents } from '@/lib/socket-events';

const RESOURCE_LIMIT = 100;
const ALL_VALUE = 'all';

interface BookingCalendarProps {
  lockedTherapistId?: string;
  hideTitle?: boolean;
  pageTitle?: string;
  pageDescription?: string;
}

export function BookingCalendar({
  lockedTherapistId,
  hideTitle,
  pageTitle = 'Therapy Booking',
  pageDescription = 'Daily view · 15-minute slots · therapy rooms · therapist color coding',
}: BookingCalendarProps = {}) {
  const { showBookingAction } = useToast();
  const { notifyAfterBookingAction } = useBookingWhatsApp();
  const clinicContext = useClinicOptional();
  const clinic = clinicContext?.clinic;
  const clinicName = getClinicDisplayName(clinic);
  const clinicLocation = clinic ? formatClinicLocation(clinic) : null;
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [therapies, setTherapies] = useState<Therapy[]>([]);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);
  const loadRequestIdRef = useRef(0);

  const [filterTherapistId, setFilterTherapistId] = useState<string>(
    lockedTherapistId ?? ALL_VALUE,
  );
  const [filterRoomId, setFilterRoomId] = useState<string>(ALL_VALUE);

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [slotPrefill, setSlotPrefill] = useState<BookingSlotPrefill | undefined>();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [editPasswordOpen, setEditPasswordOpen] = useState(false);
  const [editPassword, setEditPassword] = useState<string | undefined>();
  const [pendingEditBooking, setPendingEditBooking] = useState<Booking | null>(null);

  const activeBookings = useMemo(
    () =>
      bookings.filter(
        (b) => !['CANCELLED', 'RESCHEDULED', 'NO_SHOW'].includes(b.status),
      ),
    [bookings],
  );

  const filteredBookings = useMemo(() => {
    let result = activeBookings;
    if (filterTherapistId !== ALL_VALUE) {
      result = result.filter((b) => b.therapistId === filterTherapistId);
    }
    if (filterRoomId !== ALL_VALUE) {
      result = result.filter((b) => b.roomId === filterRoomId);
    }
    return result;
  }, [activeBookings, filterTherapistId, filterRoomId]);

  const filteredRooms = useMemo(() => {
    if (filterRoomId === ALL_VALUE) return rooms;
    return rooms.filter((r) => r.id === filterRoomId);
  }, [rooms, filterRoomId]);

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
        const [dayBookings, therapistResult, roomResult, therapyResult, holidayResult] =
          await Promise.all([
            fetchBookingsForDate(selectedDate, RESOURCE_LIMIT, { bookingType: 'THERAPY' }),
            listTherapists({ limit: RESOURCE_LIMIT, isActive: true }),
            listRooms({ limit: RESOURCE_LIMIT, isActive: true, roomType: 'THERAPY' }),
            listTherapies({ limit: RESOURCE_LIMIT, isActive: true }),
            listPublicHolidays({
              limit: RESOURCE_LIMIT,
              dateFrom: startOfDay(selectedDate).toISOString(),
              dateTo: endOfDay(selectedDate).toISOString(),
            }),
          ]);
        if (requestId !== loadRequestIdRef.current) return;
        setBookings(dayBookings);
        setTherapists(
          lockedTherapistId
            ? therapistResult.data.filter((t) => t.id === lockedTherapistId)
            : therapistResult.data,
        );
        setRooms(roomResult.data);
        setTherapies(therapyResult.data);
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
    [selectedDate, lockedTherapistId],
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
    if (lockedTherapistId) {
      setFilterTherapistId(lockedTherapistId);
    }
  }, [lockedTherapistId]);

  function handleClearFilters() {
    if (!lockedTherapistId) setFilterTherapistId(ALL_VALUE);
    setFilterRoomId(ALL_VALUE);
  }

  function handleSelectBooking(booking: Booking) {
    setSelectedBooking(booking);
    setDetailOpen(true);
  }

  function openCreate(prefill?: BookingSlotPrefill) {
    setFormMode('create');
    setSlotPrefill(prefill);
    setSelectedBooking(null);
    setFormOpen(true);
  }

  function openEditForm(booking: Booking, password?: string) {
    setSelectedBooking(booking);
    setFormMode('edit');
    setSlotPrefill(undefined);
    setEditPassword(password);
    setDetailOpen(false);
    setFormOpen(true);
  }

  function requestEdit(booking?: Booking) {
    const target = booking ?? selectedBooking;
    if (!target || !canRequestBookingEdit(target)) return;
    if (isCompletedBookingEdit(target)) {
      setPendingEditBooking(target);
      setEditPasswordOpen(true);
      return;
    }
    openEditForm(target);
  }

  function openEdit() {
    requestEdit();
  }

  function openEditFromCard(booking: Booking) {
    requestEdit(booking);
  }

  function handleEmptySlotClick(roomId: string, time: string) {
    openCreate({ roomId, startTime: time, date: selectedDate });
  }

  function openPostponeFromCard(booking: Booking) {
    setSelectedBooking(booking);
    setRescheduleOpen(true);
  }

  function openCancelFromCard(booking: Booking) {
    setSelectedBooking(booking);
    setCancelOpen(true);
  }

  async function handleCancel(input: { reason: string; cancelPassword?: string }) {
    if (!selectedBooking) return;
    const previous = selectedBooking;
    const { booking: updated } = await cancelBooking(
      previous.id,
      buildCancelBookingPayload(input),
    );
    setCancelOpen(false);
    setDetailOpen(false);
    const whatsapp = await notifyAfterBookingAction({
      booking: updated,
      eventType: 'CANCELLED',
    });
    showBookingAction({
      action: 'cancel',
      booking: updated,
      cancellationReason: input.reason || undefined,
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

  const resourcesReady =
    therapists.length > 0 && rooms.length > 0 && therapies.length > 0;

  const hasActiveFilters =
    filterTherapistId !== ALL_VALUE || filterRoomId !== ALL_VALUE;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {!hideTitle && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
            <p className="text-sm text-muted-foreground">{pageDescription}</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => void loadData({ background: true })}
            aria-label="Refresh"
            disabled={refreshing}
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          </Button>
          {!lockedTherapistId && (
            <Button onClick={() => openCreate()} disabled={!resourcesReady}>
              <Plus className="h-4 w-4" />
              Create Booking
            </Button>
          )}
        </div>
      </div>

      {!resourcesReady && !initialLoading && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Add at least one active therapist, room, and therapy before creating bookings.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="hidden xl:block xl:w-56 xl:shrink-0">
          <CalendarFilters
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            className="xl:sticky xl:top-6"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="xl:hidden">
            <CalendarFilters selectedDate={selectedDate} onDateChange={setSelectedDate} />
          </div>
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
              {filteredBookings.length} active booking
              {filteredBookings.length === 1 ? '' : 's'}
              {hasActiveFilters && ' (filtered)'}
              {refreshing && ' · Updating…'}
              {!lockedTherapistId && ' · Click an empty cell to book · Hover a booking for actions'}
              {lockedTherapistId && ' · View-only schedule'}
            </p>
          </div>

          {!lockedTherapistId && (
            <div className="rounded-lg border bg-white p-3 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Quick filter
                </p>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleClearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-700">Therapist</p>
                  <Select value={filterTherapistId} onValueChange={setFilterTherapistId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All therapists" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>All therapists</SelectItem>
                      {therapists.map((therapist) => (
                        <SelectItem key={therapist.id} value={therapist.id}>
                          {getTherapistName(therapist)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-700">Room</p>
                  <Select value={filterRoomId} onValueChange={setFilterRoomId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All rooms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>All rooms</SelectItem>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}
                          {room.code ? ` (${room.code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {(initialLoading || refreshing) && bookings.length === 0 ? (
            <div className="rounded-lg border p-12 text-center text-sm text-muted-foreground">
              Loading schedule…
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
              No rooms available. Add rooms in Room Management.
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
                  !lockedTherapistId && resourcesReady ? handleEmptySlotClick : undefined
                }
                showBookingActions={!lockedTherapistId}
                onEditBooking={openEditFromCard}
                onPostponeBooking={openPostponeFromCard}
                onCancelBooking={openCancelFromCard}
              />
            </>
          )}
        </div>
      </div>

      <BookingDetailDialog
        booking={selectedBooking}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={openEdit}
        onReschedule={() => {
          setDetailOpen(false);
          setRescheduleOpen(true);
        }}
        onCancel={() => {
          setDetailOpen(false);
          setCancelOpen(true);
        }}
        onComplete={lockedTherapistId ? undefined : handleComplete}
        viewerRole={lockedTherapistId ? 'therapist' : 'admin'}
      />

      <BookingFormModal
        mode={formMode}
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultDate={selectedDate}
        therapists={therapists}
        rooms={rooms}
        therapies={therapies}
        dayBookings={bookings}
        booking={formMode === 'edit' ? selectedBooking : null}
        editPassword={editPassword}
        prefill={slotPrefill}
        onSuccess={() => {
          setEditPassword(undefined);
          void loadData({ background: true });
        }}
        onTherapyCreated={(therapy) => {
          setTherapies((prev) => {
            if (prev.some((t) => t.id === therapy.id)) return prev;
            return [...prev, therapy].sort((a, b) => a.name.localeCompare(b.name));
          });
        }}
      />

      <BookingRescheduleModal
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        booking={selectedBooking}
        therapists={therapists}
        rooms={rooms}
        onSuccess={(newStartTime) => {
          if (newStartTime) {
            setSelectedDate(new Date(newStartTime));
          }
          void loadData({ background: true });
        }}
      />

      <CancelBookingDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        isCompleted={selectedBooking?.status === 'COMPLETED'}
        onSubmit={handleCancel}
      />

      <CompletedBookingPasswordDialog
        open={editPasswordOpen}
        onOpenChange={(open) => {
          setEditPasswordOpen(open);
          if (!open) setPendingEditBooking(null);
        }}
        onSubmit={async (password) => {
          if (password !== COMPLETED_BOOKING_PASSWORD) {
            throw new Error('Invalid password');
          }
          if (!pendingEditBooking) return;
          openEditForm(pendingEditBooking, password);
          setPendingEditBooking(null);
        }}
      />
    </div>
  );
}
