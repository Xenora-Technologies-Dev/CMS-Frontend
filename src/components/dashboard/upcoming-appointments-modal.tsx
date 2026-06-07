'use client';

import { BookingDetailDialog } from '@/components/booking/booking-dialogs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
import type { Booking } from '@/lib/types';
import {
  formatDateInput,
  formatTime,
  getPatientName,
  getTherapistName,
} from '@/lib/utils';
import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

const ALL_VALUE = '__all__';

interface UpcomingAppointmentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookings: Booking[];
  title?: string;
  viewerRole?: 'admin' | 'therapist';
}

export function UpcomingAppointmentsModal({
  open,
  onOpenChange,
  bookings,
  title = 'Upcoming Appointments',
  viewerRole = 'admin',
}: UpcomingAppointmentsModalProps) {
  const [patientSearch, setPatientSearch] = useState('');
  const [therapistId, setTherapistId] = useState(ALL_VALUE);
  const [therapyId, setTherapyId] = useState(ALL_VALUE);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const therapists = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of bookings) {
      if (b.therapist) {
        map.set(b.therapist.id, getTherapistName(b.therapist));
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [bookings]);

  const therapies = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of bookings) {
      if (b.therapy) {
        map.set(b.therapy.id, b.therapy.name);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [bookings]);

  const filtered = useMemo(() => {
    const query = patientSearch.trim().toLowerCase();
    return bookings.filter((b) => {
      if (query) {
        const name = getPatientName(b.patient).toLowerCase();
        if (!name.includes(query)) return false;
      }
      if (therapistId !== ALL_VALUE && b.therapistId !== therapistId) return false;
      if (therapyId !== ALL_VALUE && b.therapyId !== therapyId) return false;
      const bookingDate = formatDateInput(new Date(b.startTime));
      if (dateFrom && bookingDate < dateFrom) return false;
      if (dateTo && bookingDate > dateTo) return false;
      return true;
    });
  }, [bookings, patientSearch, therapistId, therapyId, dateFrom, dateTo]);

  function clearFilters() {
    setPatientSearch('');
    setTherapistId(ALL_VALUE);
    setTherapyId(ALL_VALUE);
    setDateFrom('');
    setDateTo('');
  }

  const hasFilters =
    patientSearch.trim() ||
    therapistId !== ALL_VALUE ||
    therapyId !== ALL_VALUE ||
    dateFrom ||
    dateTo;

  function handleOpenChange(next: boolean) {
    if (!next) {
      clearFilters();
      setSelectedBooking(null);
      setDetailOpen(false);
    }
    onOpenChange(next);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>{title}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {filtered.length} of {bookings.length} upcoming appointment
              {bookings.length !== 1 ? 's' : ''}
            </p>
          </DialogHeader>

          <div className="space-y-4 border-b px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-900">Filters</p>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 h-3.5 w-3.5" />
                  Clear
                </Button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="upcoming-patient-search">Patient name</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="upcoming-patient-search"
                    placeholder="Search by patient name…"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {viewerRole === 'admin' && therapists.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Therapist</Label>
                  <Select value={therapistId} onValueChange={setTherapistId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All therapists" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>All therapists</SelectItem>
                      {therapists.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {therapies.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Therapy</Label>
                  <Select value={therapyId} onValueChange={setTherapyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All therapies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>All therapies</SelectItem>
                      {therapies.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="upcoming-date-from">From date</Label>
                <Input
                  id="upcoming-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="upcoming-date-to">To date</Label>
                <Input
                  id="upcoming-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {hasFilters
                  ? 'No appointments match your filters.'
                  : 'No upcoming appointments.'}
              </p>
            ) : (
              <ul className="divide-y">
                {filtered.map((booking) => {
                  const date = new Date(booking.startTime);
                  return (
                    <li key={booking.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setDetailOpen(true);
                        }}
                        className="flex w-full items-start gap-3 rounded-lg py-3 text-left transition-colors hover:bg-slate-50"
                      >
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md bg-slate-100 text-center">
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                            {date.toLocaleDateString('en-GB', { month: 'short' })}
                          </span>
                          <span className="text-lg font-bold leading-none text-slate-900">
                            {date.getDate()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-900">
                            {getPatientName(booking.patient)}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">
                            {booking.therapy?.name ?? 'Appointment'} ·{' '}
                            {booking.therapist ? getTherapistName(booking.therapist) : '—'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(booking.startTime)} · {booking.room.name}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BookingDetailDialog
        booking={selectedBooking}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        viewerRole={viewerRole}
      />
    </>
  );
}
