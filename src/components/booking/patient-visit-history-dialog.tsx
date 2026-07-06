'use client';

import { BookingCommentsThread } from '@/components/booking/booking-comments-thread';
import { BookingStatusBadge } from '@/components/booking/booking-status-badge';
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
import { fetchPatientBookings } from '@/lib/booking-api';
import type { Booking, BookingStatus, Patient } from '@/lib/types';
import {
  cn,
  formatDateTime,
  getDoctorName,
  getPatientName,
  getTherapistName,
} from '@/lib/utils';
import { ChevronDown, ChevronUp, History, Loader2, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PENDING_CONFIRMATION', label: 'Pending' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No show' },
];

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'THERAPY', label: 'Therapy' },
  { value: 'CONSULTATION', label: 'Consultation' },
];

interface PatientVisitHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
}

function VisitHistoryRow({ visit }: { visit: Booking }) {
  const [expanded, setExpanded] = useState(false);
  const staffName =
    visit.bookingType === 'CONSULTATION' && visit.doctor
      ? getDoctorName(visit.doctor)
      : visit.therapist
        ? getTherapistName(visit.therapist)
        : '—';

  return (
    <div className="rounded-lg border bg-white">
      <button
        type="button"
        className="flex w-full items-start gap-3 p-3 text-left hover:bg-slate-50"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-900">
              {visit.bookingType === 'CONSULTATION'
                ? 'Consultation'
                : (visit.therapy?.name ?? 'Therapy')}
            </span>
            <BookingStatusBadge status={visit.status} />
          </div>
          <p className="text-xs text-muted-foreground">{formatDateTime(visit.startTime)}</p>
          <p className="text-xs text-muted-foreground">
            {staffName} · {visit.room?.name ?? '—'} · {visit.durationMinutes} min
          </p>
        </div>
        <span className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>
      {expanded && (
        <div className="space-y-3 border-t bg-slate-50/50 px-3 py-3">
          {visit.notes && (
            <div>
              <p className="text-xs font-medium text-slate-700">Notes</p>
              <p className="mt-1 text-sm text-slate-600">{visit.notes}</p>
            </div>
          )}
          {visit.cancellationReason && (
            <div>
              <p className="text-xs font-medium text-red-700">Cancellation reason</p>
              <p className="mt-1 text-sm text-red-600">{visit.cancellationReason}</p>
            </div>
          )}
          <div>
            <p className="mb-2 text-xs font-medium text-slate-700">Comments</p>
            <BookingCommentsThread
              bookingId={visit.id}
              canComment={false}
              viewerRole="admin"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function PatientVisitHistoryDialog({
  open,
  onOpenChange,
  patient,
}: PatientVisitHistoryDialogProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const loadHistory = useCallback(async () => {
    if (!patient) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchPatientBookings(patient.id, 200);
      setBookings(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load visit history');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [patient]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setStatusFilter('all');
      setTypeFilter('all');
      return;
    }
    void loadHistory();
  }, [open, loadHistory]);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bookings
      .filter((b) => {
        if (statusFilter !== 'all' && b.status !== (statusFilter as BookingStatus)) return false;
        if (typeFilter !== 'all' && b.bookingType !== typeFilter) return false;
        if (!query) return true;
        const haystack = [
          b.therapy?.name,
          b.therapist ? getTherapistName(b.therapist) : '',
          b.doctor ? getDoctorName(b.doctor) : '',
          b.room?.name,
          b.notes,
          b.status,
          formatDateTime(b.startTime),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [bookings, search, statusFilter, typeFilter]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Patient Visit History
          </DialogTitle>
          <DialogDescription>
            {patient
              ? `Past appointments for ${getPatientName(patient)} (${patient.medicalRecordNo})`
              : 'Select a patient to view history'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-3">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search therapy, therapist, room, notes…"
              className="pl-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <p className="pb-2 text-xs text-muted-foreground">
              {filteredBookings.length} visit{filteredBookings.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className={cn('min-h-0 flex-1 overflow-y-auto', loading && 'opacity-60')}>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading visit history…
            </div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-destructive">{error}</p>
          ) : filteredBookings.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No visits found for the selected filters.
            </p>
          ) : (
            <div className="space-y-2 pr-1">
              {filteredBookings.map((visit) => (
                <VisitHistoryRow key={visit.id} visit={visit} />
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
