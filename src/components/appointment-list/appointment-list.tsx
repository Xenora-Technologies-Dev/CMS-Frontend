'use client';

import {
  AppointmentListFilters,
  DEFAULT_APPOINTMENT_FILTERS,
  DEFAULT_EXCLUDED_APPOINTMENT_STATUSES,
  type AppointmentListFiltersState,
} from '@/components/appointment-list/appointment-list-filters';
import { AppointmentListCard } from '@/components/appointment-list/appointment-list-card';
import { BookingsNeedsAttentionPanel } from '@/components/booking/bookings-needs-attention-panel';
import {
  CancelBookingDialog,
  BookingDetailDialog,
  CompletedBookingPasswordDialog,
} from '@/components/booking/booking-dialogs';
import { COMPLETED_BOOKING_PASSWORD } from '@/components/booking/booking-constants';
import { canRequestBookingEdit, isCompletedBookingEdit } from '@/lib/appointment-list-utils';
import { BookingFormModal } from '@/components/booking/booking-form-modal';
import { BookingRescheduleModal } from '@/components/booking/booking-reschedule-modal';
import { PaginationControls } from '@/components/shared/pagination-controls';
import {
  buildCancelBookingPayload,
  cancelBooking,
  completeBooking,
  listBookings,
  restoreBooking,
} from '@/lib/booking-api';
import { listDoctors } from '@/lib/doctor-api';
import { listRooms } from '@/lib/room-api';
import { listTherapists } from '@/lib/therapist-api';
import { listTherapies } from '@/lib/therapy-api';
import type { Booking, Doctor, PaginatedMeta, Room, Therapist, Therapy } from '@/lib/types';
import { parseDateInput, startOfDay, endOfDay } from '@/lib/utils';
import { useBackgroundLoadState } from '@/hooks/use-background-load-state';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useToast } from '@/components/providers/toast-provider';
import { useBookingWhatsApp } from '@/components/whatsapp/booking-whatsapp-provider';
import { useCallback, useEffect, useState } from 'react';
import { useSocketEvent } from '@/components/providers/socket-provider';
import { SocketEvents } from '@/lib/socket-events';

const DEFAULT_META: PaginatedMeta = { page: 1, limit: 20, total: 0, totalPages: 0 };
const RESOURCE_LIMIT = 100;

export function AppointmentList() {
  const { showBookingAction } = useToast();
  const { notifyAfterBookingAction } = useBookingWhatsApp();
  const [filters, setFilters] = useState<AppointmentListFiltersState>(DEFAULT_APPOINTMENT_FILTERS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta>(DEFAULT_META);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [therapies, setTherapies] = useState<Therapy[]>([]);
  const { initialLoading, refreshing, beginLoad, endLoad } = useBackgroundLoadState();
  const [error, setError] = useState<string | null>(null);

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [editPasswordOpen, setEditPasswordOpen] = useState(false);
  const [editPassword, setEditPassword] = useState<string | undefined>();
  const [pendingEditBooking, setPendingEditBooking] = useState<Booking | null>(null);
  const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);

  const debouncedPatientName = useDebouncedValue(filters.patientName);
  const debouncedPatientPhone = useDebouncedValue(filters.patientPhone);

  const loadResources = useCallback(async () => {
    const [therapistResult, doctorResult, roomResult, therapyResult] = await Promise.all([
      listTherapists({ limit: RESOURCE_LIMIT, isActive: true }),
      listDoctors({ limit: RESOURCE_LIMIT, isActive: true }),
      listRooms({ limit: RESOURCE_LIMIT, isActive: true }),
      listTherapies({ limit: RESOURCE_LIMIT, isActive: true }),
    ]);
    setTherapists(therapistResult.data);
    setDoctors(doctorResult.data);
    setRooms(roomResult.data);
    setTherapies(therapyResult.data);
  }, []);

  const loadBookings = useCallback(async (options?: { background?: boolean }) => {
    beginLoad(options);
    setError(null);
    try {
      const params = {
        page,
        limit,
        sort: 'default' as const,
        patientName: debouncedPatientName || undefined,
        patientPhone: debouncedPatientPhone || undefined,
        therapistId: filters.therapistId || undefined,
        therapyId: filters.therapyId || undefined,
        statusGroup: filters.statusGroup !== 'ALL' ? filters.statusGroup : undefined,
        excludeStatuses:
          filters.statusGroup === 'ALL'
            ? [...DEFAULT_EXCLUDED_APPOINTMENT_STATUSES]
            : undefined,
        dateFrom: filters.dateFrom
          ? startOfDay(parseDateInput(filters.dateFrom)).toISOString()
          : undefined,
        dateTo: filters.dateTo
          ? endOfDay(parseDateInput(filters.dateTo)).toISOString()
          : undefined,
      };
      const result = await listBookings(params);
      setBookings(result.data);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load appointments');
    } finally {
      endLoad();
    }
  }, [
    page,
    limit,
    debouncedPatientName,
    debouncedPatientPhone,
    filters.therapistId,
    filters.therapyId,
    filters.statusGroup,
    filters.dateFrom,
    filters.dateTo,
    beginLoad,
    endLoad,
  ]);

  const debouncedBackgroundReload = useDebouncedCallback(
    () => void loadBookings({ background: true }),
    600,
  );

  useEffect(() => {
    void loadResources();
  }, [loadResources]);

  useEffect(() => {
    void loadBookings({ background: false });
  }, [loadBookings]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedPatientName,
    debouncedPatientPhone,
    filters.therapistId,
    filters.therapyId,
    filters.statusGroup,
    filters.dateFrom,
    filters.dateTo,
  ]);

  useSocketEvent(SocketEvents.BOOKING_UPDATED, debouncedBackgroundReload);

  function handleView(booking: Booking) {
    setSelectedBooking(booking);
    setDetailOpen(true);
  }

  function openEditForm(booking: Booking, password?: string) {
    setSelectedBooking(booking);
    setEditPassword(password);
    setFormOpen(true);
  }

  function handleEdit(booking: Booking) {
    if (!canRequestBookingEdit(booking)) return;
    if (isCompletedBookingEdit(booking)) {
      setPendingEditBooking(booking);
      setEditPasswordOpen(true);
      return;
    }
    openEditForm(booking);
  }

  function handlePostpone(booking: Booking) {
    setSelectedBooking(booking);
    setRescheduleOpen(true);
  }

  function handleCancel(booking: Booking) {
    setSelectedBooking(booking);
    setCancelOpen(true);
  }

  async function handleCancelSubmit(input: { reason: string; cancelPassword?: string }) {
    if (!selectedBooking) return;
    const previous = selectedBooking;
    const { booking: updated } = await cancelBooking(
      previous.id,
      buildCancelBookingPayload(input),
    );
    setCancelOpen(false);
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
    await loadBookings({ background: true });
  }

  async function handleRestore(booking: Booking) {
    if (!confirm('Restore this cancelled appointment?')) return;
    if (processingBookingId) return;
    setProcessingBookingId(booking.id);
    try {
      await restoreBooking(booking.id);
      await loadBookings({ background: true });
    } finally {
      setProcessingBookingId(null);
    }
  }

  async function handleComplete(booking: Booking) {
    if (!confirm('Mark this appointment as completed?')) return;
    if (processingBookingId) return;
    setProcessingBookingId(booking.id);
    try {
      await completeBooking(booking.id);
      await loadBookings({ background: true });
    } finally {
      setProcessingBookingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <BookingsNeedsAttentionPanel
        onActionComplete={() => void loadBookings({ background: true })}
      />

      <AppointmentListFilters
        filters={filters}
        therapists={therapists}
        therapies={therapies}
        loading={refreshing}
        onChange={setFilters}
        onRefresh={() => void loadBookings({ background: true })}
        onClear={() => setFilters(DEFAULT_APPOINTMENT_FILTERS)}
      />

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {initialLoading ? (
        <div className="rounded-xl border p-12 text-center text-sm text-muted-foreground">
          Loading appointments…
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          No appointments match your filters.
        </div>
      ) : (
        <div
          className={`grid gap-4 md:grid-cols-2 xl:grid-cols-1 transition-opacity ${refreshing ? 'opacity-60' : ''}`}
        >
          {bookings.map((booking) => (
            <AppointmentListCard
              key={booking.id}
              booking={booking}
              processing={processingBookingId === booking.id}
              onView={handleView}
              onEdit={handleEdit}
              onPostpone={handlePostpone}
              onCancel={handleCancel}
              onRestore={handleRestore}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}

      <PaginationControls
        meta={{ ...meta, page, limit }}
        onPageChange={setPage}
        onLimitChange={(value) => {
          setLimit(value);
          setPage(1);
        }}
      />

      <BookingDetailDialog
        booking={selectedBooking}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={() => {
          if (!selectedBooking) return;
          setDetailOpen(false);
          handleEdit(selectedBooking);
        }}
        onReschedule={() => {
          setDetailOpen(false);
          setRescheduleOpen(true);
        }}
        onCancel={() => {
          setDetailOpen(false);
          setCancelOpen(true);
        }}
        onRestore={
          selectedBooking?.status === 'CANCELLED'
            ? () => {
                void handleRestore(selectedBooking);
                setDetailOpen(false);
              }
            : undefined
        }
        onComplete={
          selectedBooking && ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'].includes(selectedBooking.status)
            ? async () => {
                await handleComplete(selectedBooking);
                setDetailOpen(false);
              }
            : undefined
        }
      />

      <BookingFormModal
        mode="edit"
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultDate={selectedBooking ? new Date(selectedBooking.startTime) : new Date()}
        therapists={therapists}
        rooms={rooms}
        therapies={therapies}
        dayBookings={bookings}
        booking={selectedBooking}
        editPassword={editPassword}
        onSuccess={() => {
          setEditPassword(undefined);
          void loadBookings({ background: true });
        }}
      />

      <BookingRescheduleModal
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        booking={selectedBooking}
        therapists={therapists}
        doctors={doctors}
        rooms={rooms}
        onSuccess={() => void loadBookings({ background: true })}
      />

      <CancelBookingDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        isCompleted={selectedBooking?.status === 'COMPLETED'}
        onSubmit={handleCancelSubmit}
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
