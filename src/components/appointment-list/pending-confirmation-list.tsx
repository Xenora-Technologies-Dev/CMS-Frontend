'use client';

import { BookingStatusBadge } from '@/components/booking/booking-status-badge';
import {
  BookingDetailDialog,
  CancelBookingDialog,
} from '@/components/booking/booking-dialogs';
import { BookingRescheduleModal } from '@/components/booking/booking-reschedule-modal';
import { PaginationControls } from '@/components/shared/pagination-controls';
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
import { useToast } from '@/components/providers/toast-provider';
import { useBackgroundLoadState } from '@/hooks/use-background-load-state';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cancelBooking, completeBooking, listBookings } from '@/lib/booking-api';
import { listDoctors } from '@/lib/doctor-api';
import { listRooms } from '@/lib/room-api';
import { listTherapists } from '@/lib/therapist-api';
import type { Booking, BookingType, Doctor, PaginatedMeta, Room, Therapist } from '@/lib/types';
import {
  formatTime,
  getDoctorName,
  getPatientName,
  getTherapistColor,
  getTherapistName,
  parseDateInput,
  startOfDay,
  endOfDay,
} from '@/lib/utils';
import { useSocketEvent } from '@/components/providers/socket-provider';
import { SocketEvents } from '@/lib/socket-events';
import { Check, Eye, Loader2, RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const DEFAULT_META: PaginatedMeta = { page: 1, limit: 20, total: 0, totalPages: 0 };
const RESOURCE_LIMIT = 100;

interface PendingFilters {
  patientName: string;
  patientPhone: string;
  bookingType: BookingType | 'ALL';
  therapistId: string;
  doctorId: string;
  dateFrom: string;
  dateTo: string;
}

const DEFAULT_FILTERS: PendingFilters = {
  patientName: '',
  patientPhone: '',
  bookingType: 'ALL',
  therapistId: '',
  doctorId: '',
  dateFrom: '',
  dateTo: '',
};

function PendingRow({
  booking,
  onView,
  onComplete,
  onDismiss,
  completingBookingId,
  actionBusy,
}: {
  booking: Booking;
  onView: (booking: Booking) => void;
  onComplete: (booking: Booking) => void;
  onDismiss: (booking: Booking) => void;
  completingBookingId: string | null;
  actionBusy: boolean;
}) {
  const isCompleting = completingBookingId === booking.id;
  const staffLabel =
    booking.bookingType === 'CONSULTATION'
      ? booking.doctor
        ? getDoctorName(booking.doctor)
        : 'Doctor'
      : booking.therapist
        ? getTherapistName(booking.therapist)
        : 'Therapist';

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      style={{
        borderLeftWidth: 4,
        borderLeftColor: getTherapistColor(booking.therapist?.colorCode),
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-slate-900">{getPatientName(booking.patient)}</p>
          <BookingStatusBadge status={booking.status} />
          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-600">
            {booking.bookingType === 'CONSULTATION' ? 'Consultation' : 'Therapy'}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {booking.bookingType === 'CONSULTATION'
            ? 'Consultation'
            : (booking.therapy?.name ?? 'Appointment')}
          {' · '}
          {staffLabel}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(booking.startTime).toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
          {' · '}
          {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
          {booking.room?.name ? ` · ${booking.room.name}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-9 w-9"
          aria-label="View details"
          disabled={actionBusy}
          onClick={() => onView(booking)}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-9 w-9 text-emerald-600 hover:bg-emerald-50"
          aria-label="Confirm completed"
          disabled={actionBusy}
          onClick={() => onComplete(booking)}
        >
          {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-9 w-9 text-destructive hover:bg-destructive/5"
          aria-label="Postpone or cancel"
          disabled={actionBusy}
          onClick={() => onDismiss(booking)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function PendingConfirmationList() {
  const { showBookingAction } = useToast();
  const [filters, setFilters] = useState<PendingFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta>(DEFAULT_META);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const { initialLoading, refreshing, beginLoad, endLoad } = useBackgroundLoadState();
  const [error, setError] = useState<string | null>(null);

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<Booking | null>(null);
  const [completingBookingId, setCompletingBookingId] = useState<string | null>(null);

  const debouncedPatientName = useDebouncedValue(filters.patientName);
  const debouncedPatientPhone = useDebouncedValue(filters.patientPhone);

  const loadResources = useCallback(async () => {
    const [therapistResult, doctorResult, roomResult] = await Promise.all([
      listTherapists({ limit: RESOURCE_LIMIT, isActive: true }),
      listDoctors({ limit: RESOURCE_LIMIT, isActive: true }),
      listRooms({ limit: RESOURCE_LIMIT, isActive: true }),
    ]);
    setTherapists(therapistResult.data);
    setDoctors(doctorResult.data);
    setRooms(roomResult.data);
  }, []);

  const loadBookings = useCallback(
    async (options?: { background?: boolean }) => {
      beginLoad(options);
      setError(null);
      try {
        const result = await listBookings({
          page,
          limit,
          sort: 'default',
          status: 'PENDING_CONFIRMATION',
          patientName: debouncedPatientName || undefined,
          patientPhone: debouncedPatientPhone || undefined,
          therapistId: filters.therapistId || undefined,
          doctorId: filters.doctorId || undefined,
          bookingType: filters.bookingType !== 'ALL' ? filters.bookingType : undefined,
          dateFrom: filters.dateFrom
            ? startOfDay(parseDateInput(filters.dateFrom)).toISOString()
            : undefined,
          dateTo: filters.dateTo
            ? endOfDay(parseDateInput(filters.dateTo)).toISOString()
            : undefined,
        });
        setBookings(result.data);
        setMeta(result.meta);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pending bookings');
      } finally {
        endLoad();
      }
    },
    [
      page,
      limit,
      debouncedPatientName,
      debouncedPatientPhone,
      filters.therapistId,
      filters.doctorId,
      filters.bookingType,
      filters.dateFrom,
      filters.dateTo,
      beginLoad,
      endLoad,
    ],
  );

  useEffect(() => {
    void loadResources();
  }, [loadResources]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  useSocketEvent(SocketEvents.BOOKING_UPDATED, () => {
    void loadBookings({ background: true });
  });

  function patchFilters(partial: Partial<PendingFilters>) {
    setFilters((prev) => ({ ...prev, ...partial }));
    setPage(1);
  }

  async function handleComplete(booking: Booking) {
    if (completingBookingId) return;
    setCompletingBookingId(booking.id);
    try {
      await completeBooking(booking.id);
      showBookingAction({ action: 'complete', booking });
      void loadBookings({ background: true });
    } catch (err) {
      showBookingAction({
        action: 'complete',
        booking,
        error: err instanceof Error ? err.message : 'Failed to complete booking',
      });
    } finally {
      setCompletingBookingId(null);
    }
  }

  function openDismissDialog(booking: Booking) {
    setActionTarget(booking);
    setActionDialogOpen(true);
  }

  const actionBusy = Boolean(completingBookingId);

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadBookings({ background: true })}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="patientName">Patient Name</Label>
            <Input
              id="patientName"
              placeholder="Search name…"
              value={filters.patientName}
              onChange={(e) => patchFilters({ patientName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="patientPhone">Patient Phone</Label>
            <Input
              id="patientPhone"
              placeholder="Search phone…"
              value={filters.patientPhone}
              onChange={(e) => patchFilters({ patientPhone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Booking Type</Label>
            <Select
              value={filters.bookingType}
              onValueChange={(value) =>
                patchFilters({ bookingType: value as BookingType | 'ALL' })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                <SelectItem value="THERAPY">Therapy</SelectItem>
                <SelectItem value="CONSULTATION">Consultation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Therapist</Label>
            <Select
              value={filters.therapistId || 'ALL'}
              onValueChange={(value) =>
                patchFilters({ therapistId: value === 'ALL' ? '' : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All therapists" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All therapists</SelectItem>
                {therapists.map((therapist) => (
                  <SelectItem key={therapist.id} value={therapist.id}>
                    {getTherapistName(therapist)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Doctor</Label>
            <Select
              value={filters.doctorId || 'ALL'}
              onValueChange={(value) =>
                patchFilters({ doctorId: value === 'ALL' ? '' : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All doctors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All doctors</SelectItem>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {getDoctorName(doctor)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dateFrom">From</Label>
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => patchFilters({ dateFrom: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dateTo">To</Label>
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo}
              onChange={(e) => patchFilters({ dateTo: e.target.value })}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {initialLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading pending confirmations…
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-xl border bg-white py-16 text-center text-sm text-muted-foreground shadow-sm">
          No bookings awaiting confirmation
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <PendingRow
              key={booking.id}
              booking={booking}
              onView={(row) => {
                setSelectedBooking(row);
                setDetailOpen(true);
              }}
              onComplete={handleComplete}
              onDismiss={openDismissDialog}
              completingBookingId={completingBookingId}
              actionBusy={actionBusy}
            />
          ))}
        </div>
      )}

      <PaginationControls
        meta={{ ...meta, page, limit }}
        onPageChange={setPage}
        onLimitChange={(next) => {
          setLimit(next);
          setPage(1);
        }}
      />

      {actionDialogOpen && actionTarget && (
        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>What would you like to do?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {getPatientName(actionTarget.patient)} needs your action.
            </p>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                disabled={actionBusy}
                onClick={() => {
                  setActionDialogOpen(false);
                  setSelectedBooking(actionTarget);
                  setRescheduleOpen(true);
                }}
              >
                Postpone
              </Button>
              <Button
                variant="destructive"
                disabled={actionBusy}
                onClick={() => {
                  setActionDialogOpen(false);
                  setSelectedBooking(actionTarget);
                  setCancelOpen(true);
                }}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <BookingDetailDialog
        booking={selectedBooking}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onReschedule={() => {
          setDetailOpen(false);
          setRescheduleOpen(true);
        }}
        onCancel={() => {
          setDetailOpen(false);
          setCancelOpen(true);
        }}
        viewerRole="admin"
      />

      <BookingRescheduleModal
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        booking={selectedBooking}
        therapists={therapists}
        doctors={doctors}
        rooms={rooms}
        onSuccess={() => {
          setRescheduleOpen(false);
          void loadBookings({ background: true });
        }}
      />

      <CancelBookingDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onSubmit={async (reason) => {
          if (!selectedBooking) return;
          const { booking: updated } = await cancelBooking(selectedBooking.id, {
            cancellationReason: reason || undefined,
          });
          setCancelOpen(false);
          showBookingAction({
            action: 'cancel',
            booking: updated,
            cancellationReason: reason,
          });
          void loadBookings({ background: true });
        }}
      />
    </div>
  );
}
