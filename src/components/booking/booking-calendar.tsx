'use client';

import {
  cancelBooking,
  fetchBookingsForDate,
  searchPatients,
} from '@/lib/booking-api';
import { listRooms } from '@/lib/room-api';
import { listTherapists } from '@/lib/therapist-api';
import { listTherapies } from '@/lib/therapy-api';
import type { Booking, Patient, Room, Therapist, Therapy } from '@/lib/types';
import { cn, getTherapistColor, getTherapistName } from '@/lib/utils';
import { BookingCardList } from '@/components/booking/booking-card';
import { CalendarFilters } from '@/components/booking/calendar-filters';
import {
  BookingDetailDialog,
  CancelBookingDialog,
} from '@/components/booking/booking-dialogs';
import { BookingFormModal, type BookingSlotPrefill } from '@/components/booking/booking-form-modal';
import { BookingRescheduleModal } from '@/components/booking/booking-reschedule-modal';
import { BookingTimeline } from '@/components/booking/booking-timeline';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSocketEvent } from '@/components/providers/socket-provider';
import { useClinicOptional } from '@/components/providers/clinic-provider';
import { formatClinicLocation, getClinicDisplayName } from '@/lib/clinic-api';
import { SocketEvents } from '@/lib/socket-events';

const RESOURCE_LIMIT = 100;

interface BookingCalendarProps {
  lockedTherapistId?: string;
  hideTitle?: boolean;
}

export function BookingCalendar({ lockedTherapistId, hideTitle }: BookingCalendarProps = {}) {
  const clinicContext = useClinicOptional();
  const clinic = clinicContext?.clinic;
  const clinicName = getClinicDisplayName(clinic);
  const clinicLocation = clinic ? formatClinicLocation(clinic) : null;
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [therapies, setTherapies] = useState<Therapy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTherapistIds, setSelectedTherapistIds] = useState<string[]>(
    lockedTherapistId ? [lockedTherapistId] : [],
  );
  const [primaryTherapistId, setPrimaryTherapistId] = useState<string>(
    lockedTherapistId ?? 'all',
  );
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [slotPrefill, setSlotPrefill] = useState<BookingSlotPrefill | undefined>();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const activeBookings = useMemo(
    () =>
      bookings.filter(
        (b) => !['CANCELLED', 'RESCHEDULED', 'NO_SHOW'].includes(b.status),
      ),
    [bookings],
  );

  const filteredBookings = useMemo(() => {
    let result = activeBookings;
    if (selectedTherapistIds.length > 0) {
      result = result.filter((b) => selectedTherapistIds.includes(b.therapistId));
    }
    if (selectedRoomIds.length > 0) {
      result = result.filter((b) => selectedRoomIds.includes(b.roomId));
    }
    return result;
  }, [activeBookings, selectedTherapistIds, selectedRoomIds]);

  const filteredRooms = useMemo(() => {
    if (selectedRoomIds.length === 0) return rooms;
    return rooms.filter((r) => selectedRoomIds.includes(r.id));
  }, [rooms, selectedRoomIds]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dayBookings, therapistResult, roomResult, therapyResult] = await Promise.all([
        fetchBookingsForDate(selectedDate, RESOURCE_LIMIT),
        listTherapists({ limit: RESOURCE_LIMIT, isActive: true }),
        listRooms({ limit: RESOURCE_LIMIT, isActive: true }),
        listTherapies({ limit: RESOURCE_LIMIT, isActive: true }),
      ]);
      setBookings(dayBookings);
      setTherapists(
        lockedTherapistId
          ? therapistResult.data.filter((t) => t.id === lockedTherapistId)
          : therapistResult.data,
      );
      setRooms(roomResult.data);
      setTherapies(therapyResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useSocketEvent(SocketEvents.BOOKING_UPDATED, () => {
    void loadData();
  });

  useSocketEvent(SocketEvents.SCHEDULE_UPDATED, () => {
    void loadData();
  });

  useEffect(() => {
    if (lockedTherapistId) {
      setSelectedTherapistIds([lockedTherapistId]);
      setPrimaryTherapistId(lockedTherapistId);
    }
  }, [lockedTherapistId]);

  function handlePrimaryTherapistChange(id: string) {
    if (lockedTherapistId) return;
    setPrimaryTherapistId(id);
    setSelectedTherapistIds(id === 'all' ? [] : [id]);
  }

  function handleTherapistToggle(id: string) {
    if (lockedTherapistId) return;
    setSelectedTherapistIds((current) =>
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id],
    );
  }

  function handleRoomToggle(id: string) {
    setSelectedRoomIds((current) =>
      current.includes(id) ? current.filter((r) => r !== id) : [...current, id],
    );
  }

  function handleClearFilters() {
    if (!lockedTherapistId) {
      setSelectedTherapistIds([]);
      setPrimaryTherapistId('all');
    }
    setSelectedRoomIds([]);
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

  function openEdit() {
    setFormMode('edit');
    setSlotPrefill(undefined);
    setDetailOpen(false);
    setFormOpen(true);
  }

  function handleEmptySlotClick(roomId: string, time: string) {
    openCreate({ roomId, startTime: time, date: selectedDate });
  }

  function openEditFromCard(booking: Booking) {
    setSelectedBooking(booking);
    setFormMode('edit');
    setSlotPrefill(undefined);
    setFormOpen(true);
  }

  function openPostponeFromCard(booking: Booking) {
    setSelectedBooking(booking);
    setRescheduleOpen(true);
  }

  function openCancelFromCard(booking: Booking) {
    setSelectedBooking(booking);
    setCancelOpen(true);
  }

  async function handleCancel(reason: string) {
    if (!selectedBooking) return;
    await cancelBooking(selectedBooking.id, {
      cancellationReason: reason || undefined,
    });
    setDetailOpen(false);
    await loadData();
  }

  const dateLabel = selectedDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const filterProps = {
    selectedDate,
    onDateChange: setSelectedDate,
    therapists,
    rooms,
    selectedTherapistIds,
    selectedRoomIds,
    onTherapistToggle: handleTherapistToggle,
    onRoomToggle: handleRoomToggle,
    onClearFilters: handleClearFilters,
    primaryTherapistId,
    onPrimaryTherapistChange: handlePrimaryTherapistChange,
    lockTherapistFilter: !!lockedTherapistId,
  };

  const resourcesReady =
    therapists.length > 0 && rooms.length > 0 && therapies.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {!hideTitle && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Booking Calendar</h1>
            <p className="text-sm text-muted-foreground">
              Daily view · 15-minute slots · rooms as columns · therapist color coding
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
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
          <Button
            variant="outline"
            className="lg:hidden"
            onClick={() => setMobileFiltersOpen((v) => !v)}
          >
            Filters
          </Button>
          {!lockedTherapistId && (
            <Button onClick={() => openCreate()} disabled={!resourcesReady}>
              <Plus className="h-4 w-4" />
              Create Booking
            </Button>
          )}
        </div>
      </div>

      {!resourcesReady && !loading && (
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
        <div
          className={cn(
            'xl:w-64 xl:shrink-0',
            mobileFiltersOpen ? 'block' : 'hidden xl:block',
          )}
        >
          <CalendarFilters {...filterProps} className="xl:sticky xl:top-6" />
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
              {filteredBookings.length} active booking
              {filteredBookings.length === 1 ? '' : 's'}
              {(selectedTherapistIds.length > 0 || selectedRoomIds.length > 0) && ' (filtered)'}
              {!lockedTherapistId && ' · Click an empty cell to book · Hover a booking for actions'}
              {lockedTherapistId && ' · View-only schedule'}
            </p>
          </div>

          {therapists.length > 0 && !lockedTherapistId && (
            <div className="flex flex-wrap gap-2 rounded-lg border bg-white p-3 shadow-sm">
              <span className="w-full text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:w-auto sm:py-1">
                Quick filter
              </span>
              {therapists.map((therapist) => (
                <button
                  key={therapist.id}
                  type="button"
                  onClick={() => {
                    handleTherapistToggle(therapist.id);
                    setPrimaryTherapistId(
                      selectedTherapistIds.includes(therapist.id) && selectedTherapistIds.length === 1
                        ? 'all'
                        : therapist.id,
                    );
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
                    selectedTherapistIds.includes(therapist.id)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'hover:bg-slate-50',
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: getTherapistColor(therapist.colorCode) }}
                  />
                  {getTherapistName(therapist)}
                </button>
              ))}
            </div>
          )}

          {loading ? (
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
                onSelectBooking={handleSelectBooking}
                onEmptySlotClick={
                  !lockedTherapistId && resourcesReady ? handleEmptySlotClick : undefined
                }
                showBookingActions={!lockedTherapistId}
                onEditBooking={openEditFromCard}
                onPostponeBooking={openPostponeFromCard}
                onCancelBooking={openCancelFromCard}
              />
              <div className="md:hidden">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Bookings list
                </h2>
                <BookingCardList
                  bookings={filteredBookings}
                  onSelect={handleSelectBooking}
                />
              </div>
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
        prefill={slotPrefill}
        onSuccess={() => void loadData()}
      />

      <BookingRescheduleModal
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        booking={selectedBooking}
        therapists={therapists}
        rooms={rooms}
        onSuccess={() => void loadData()}
      />

      <CancelBookingDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onSubmit={handleCancel}
      />
    </div>
  );
}
