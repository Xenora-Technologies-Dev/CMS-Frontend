'use client';

import { BookingStatusBadge } from '@/components/booking/booking-status-badge';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { listRecentBookings } from '@/lib/booking-api';
import { listTherapists } from '@/lib/therapist-api';
import { formatDateTime, formatUserName } from '@/lib/appointment-list-utils';
import type { Booking, BookingStatus, PaginatedMeta, Therapist } from '@/lib/types';
import { getPatientName, getTherapistName, parseDateInput, startOfDay, endOfDay } from '@/lib/utils';
import { useBackgroundLoadState } from '@/hooks/use-background-load-state';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useSocketEvent } from '@/components/providers/socket-provider';
import { SocketEvents } from '@/lib/socket-events';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_META: PaginatedMeta = { page: 1, limit: 10, total: 0, totalPages: 0 };

export function RecentBookingsList() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta>(DEFAULT_META);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const { initialLoading, refreshing, beginLoad, endLoad } = useBackgroundLoadState();
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(10);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [therapistName, setTherapistName] = useState('');
  const [therapyName, setTherapyName] = useState('');
  const [therapistId, setTherapistId] = useState('');
  const [status, setStatus] = useState<BookingStatus | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState('');

  const debouncedPatientName = useDebouncedValue(patientName);
  const debouncedPatientPhone = useDebouncedValue(patientPhone);
  const debouncedTherapistName = useDebouncedValue(therapistName);
  const debouncedTherapyName = useDebouncedValue(therapyName);

  const load = useCallback(async (options?: { background?: boolean }) => {
    beginLoad(options);
    setError(null);
    try {
      const result = await listRecentBookings({
        page,
        limit,
        patientName: debouncedPatientName || undefined,
        patientPhone: debouncedPatientPhone || undefined,
        therapistName: debouncedTherapistName || undefined,
        therapyName: debouncedTherapyName || undefined,
        therapistId: therapistId || undefined,
        status: status === 'ALL' ? undefined : status,
        dateFrom: dateFilter ? startOfDay(parseDateInput(dateFilter)).toISOString() : undefined,
        dateTo: dateFilter ? endOfDay(parseDateInput(dateFilter)).toISOString() : undefined,
      });
      setBookings(result.data);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recent bookings');
    } finally {
      endLoad();
    }
  }, [
    page,
    limit,
    debouncedPatientName,
    debouncedPatientPhone,
    debouncedTherapistName,
    debouncedTherapyName,
    therapistId,
    status,
    dateFilter,
    beginLoad,
    endLoad,
  ]);

  const debouncedBackgroundReload = useDebouncedCallback(
    () => void load({ background: true }),
    600,
  );

  useEffect(() => {
    void listTherapists({ limit: 100, isActive: true }).then((result) => {
      setTherapists(result.data);
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useSocketEvent(SocketEvents.BOOKING_UPDATED, debouncedBackgroundReload);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="patientName">Patient name</Label>
          <Input
            id="patientName"
            value={patientName}
            onChange={(e) => {
              setPatientName(e.target.value);
              setPage(1);
            }}
            placeholder="Search patient"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="patientPhone">Patient mobile</Label>
          <Input
            id="patientPhone"
            value={patientPhone}
            onChange={(e) => {
              setPatientPhone(e.target.value);
              setPage(1);
            }}
            placeholder="Search mobile"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="therapistName">Therapist name</Label>
          <Input
            id="therapistName"
            value={therapistName}
            onChange={(e) => {
              setTherapistName(e.target.value);
              setPage(1);
            }}
            placeholder="Search therapist"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="therapyName">Therapy name</Label>
          <Input
            id="therapyName"
            value={therapyName}
            onChange={(e) => {
              setTherapyName(e.target.value);
              setPage(1);
            }}
            placeholder="Search therapy"
          />
        </div>
        <div className="space-y-1">
          <Label>Date</Label>
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as BookingStatus | 'ALL');
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Therapist</Label>
          <Select
            value={therapistId || 'ALL'}
            onValueChange={(v) => {
              setTherapistId(v === 'ALL' ? '' : v);
              setPage(1);
            }}
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
        <div className="space-y-1">
          <Label>Page size</Label>
          <Select
            value={String(limit)}
            onValueChange={(v) => {
              setLimit(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} per page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border">
        {initialLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading recent bookings…
          </div>
        ) : bookings.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No recent bookings found</p>
        ) : (
          <div className={`divide-y transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
            {bookings.map((booking) => (
              <div key={booking.id} className="space-y-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{getPatientName(booking.patient)}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.therapist
                        ? getTherapistName(booking.therapist)
                        : booking.doctor
                          ? `${booking.doctor.user.firstName} ${booking.doctor.user.lastName}`
                          : '—'}{' '}
                      · {booking.therapy?.name ?? (booking.bookingType === 'CONSULTATION' ? 'Consultation' : '—')} ·{' '}
                      {booking.room.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Booking: {formatDateTime(booking.startTime)}
                    </p>
                  </div>
                  <BookingStatusBadge status={booking.status} />
                </div>
                <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                  <p>Created by {formatUserName(booking.createdBy)}</p>
                  <p>Created at {formatDateTime(booking.createdAt)}</p>
                  {booking.updatedBy && (
                    <p>Modified by {formatUserName(booking.updatedBy)} · {formatDateTime(booking.updatedAt)}</p>
                  )}
                  {booking.cancelledBy && (
                    <p>Cancelled by {formatUserName(booking.cancelledBy)} · {formatDateTime(booking.cancelledAt)}</p>
                  )}
                  {booking.rescheduledBy && (
                    <p>Rescheduled by {formatUserName(booking.rescheduledBy)} · {formatDateTime(booking.rescheduledAt)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PaginationControls meta={meta} onPageChange={setPage} />
    </div>
  );
}
