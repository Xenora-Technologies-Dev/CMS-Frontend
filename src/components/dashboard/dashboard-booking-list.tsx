'use client';

import { BookingStatusBadge } from '@/components/booking/booking-status-badge';
import {
  BookingDetailDialog,
  CancelBookingDialog,
} from '@/components/booking/booking-dialogs';
import { BookingRescheduleModal } from '@/components/booking/booking-reschedule-modal';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/providers/toast-provider';
import { useBookingWhatsApp } from '@/components/whatsapp/booking-whatsapp-provider';
import { cancelBooking, completeBooking } from '@/lib/booking-api';
import type { Booking, Doctor, Room, Therapist } from '@/lib/types';
import {
  formatTime,
  getPatientName,
  getTherapistColor,
  getTherapistName,
} from '@/lib/utils';
import { Check, Eye, Loader2, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const PREVIEW_LIMIT = 5;

interface DashboardBookingListProps {
  title: string;
  therapyBookings: Booking[];
  consultationBookings: Booking[];
  showPendingActions?: boolean;
  showPostponeCancel?: boolean;
  hideHeader?: boolean;
  therapists: Therapist[];
  doctors?: Doctor[];
  rooms: Room[];
  onActionComplete?: () => void;
  viewerRole?: 'admin' | 'therapist';
  viewMoreHref?: string;
}

function BookingRow({
  booking,
  showPendingActions,
  onComplete,
  onDismiss,
  onClick,
  completingBookingId,
  actionBusy,
}: {
  booking: Booking;
  showPendingActions?: boolean;
  onComplete?: (booking: Booking) => void;
  onDismiss?: (booking: Booking) => void;
  onClick?: (booking: Booking) => void;
  completingBookingId?: string | null;
  actionBusy?: boolean;
}) {
  const isCompleting = completingBookingId === booking.id;
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
      style={{
        borderLeftWidth: 4,
        borderLeftColor: getTherapistColor(booking.therapist?.colorCode),
      }}
    >
      <button
        type="button"
        onClick={() => onClick?.(booking)}
        className="min-w-0 flex-1 text-left transition-opacity hover:opacity-80"
      >
        <p className="truncate font-medium text-slate-900">{getPatientName(booking.patient)}</p>
        <p className="truncate text-sm text-muted-foreground">
          {booking.bookingType === 'CONSULTATION'
            ? 'Consultation'
            : (booking.therapy?.name ?? 'Appointment')}
          {' · '}
          {booking.therapist
            ? getTherapistName(booking.therapist)
            : booking.doctor
              ? `Dr. ${booking.doctor.user.firstName} ${booking.doctor.user.lastName}`
              : '—'}
        </p>
        <p className="text-xs text-muted-foreground">{booking.room.name}</p>
      </button>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-medium tabular-nums">
          {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
        </span>
        <BookingStatusBadge status={booking.status} />
        {(showPendingActions || booking.status === 'PENDING_CONFIRMATION') && (
          <div className="flex gap-1">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8"
              aria-label="View details"
              disabled={actionBusy}
              onClick={() => onClick?.(booking)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
              aria-label="Mark completed"
              disabled={actionBusy}
              onClick={() => onComplete?.(booking)}
            >
              {isCompleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8 text-destructive hover:bg-destructive/5"
              aria-label="Postpone or cancel"
              disabled={actionBusy}
              onClick={() => onDismiss?.(booking)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function TypeSection({
  label,
  bookings,
  showPendingActions,
  onComplete,
  onDismiss,
  onClick,
  completingBookingId,
  actionBusy,
}: {
  label: string;
  bookings: Booking[];
  showPendingActions?: boolean;
  onComplete?: (booking: Booking) => void;
  onDismiss?: (booking: Booking) => void;
  onClick?: (booking: Booking) => void;
  completingBookingId?: string | null;
  actionBusy?: boolean;
}) {
  if (bookings.length === 0) {
    return (
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="py-2 text-sm text-muted-foreground">None</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="space-y-2">
        {bookings.map((booking) => (
          <BookingRow
            key={booking.id}
            booking={booking}
            showPendingActions={showPendingActions}
            onComplete={onComplete}
            onDismiss={onDismiss}
            onClick={onClick}
            completingBookingId={completingBookingId}
            actionBusy={actionBusy}
          />
        ))}
      </div>
    </div>
  );
}

export function DashboardBookingList({
  title,
  therapyBookings,
  consultationBookings,
  showPendingActions,
  showPostponeCancel,
  hideHeader,
  therapists,
  doctors = [],
  rooms,
  onActionComplete,
  viewerRole = 'admin',
  viewMoreHref,
}: DashboardBookingListProps) {
  const { showBookingAction } = useToast();
  const { notifyAfterBookingAction } = useBookingWhatsApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<Booking | null>(null);
  const [completingBookingId, setCompletingBookingId] = useState<string | null>(null);

  const allBookings = useMemo(
    () => [...therapyBookings, ...consultationBookings],
    [therapyBookings, consultationBookings],
  );

  const previewTherapy = therapyBookings.slice(0, PREVIEW_LIMIT);
  const remainingSlots = Math.max(0, PREVIEW_LIMIT - previewTherapy.length);
  const previewConsultation = consultationBookings.slice(0, remainingSlots);
  const previewCount = previewTherapy.length + previewConsultation.length;
  const totalCount = allBookings.length;
  const hasMore = totalCount > PREVIEW_LIMIT;

  const filteredModal = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? allBookings.filter((b) => getPatientName(b.patient).toLowerCase().includes(q))
      : allBookings;
    return splitByBookingType(filtered);
  }, [allBookings, search]);

  function splitByBookingType(bookings: Booking[]) {
    return {
      therapy: bookings.filter((b) => b.bookingType !== 'CONSULTATION'),
      consultation: bookings.filter((b) => b.bookingType === 'CONSULTATION'),
    };
  }

  function openDetail(booking: Booking) {
    setSelectedBooking(booking);
    setDetailOpen(true);
  }

  async function handleComplete(booking: Booking) {
    if (completingBookingId) return;
    setCompletingBookingId(booking.id);
    try {
      await completeBooking(booking.id);
      showBookingAction({ action: 'complete', booking });
      onActionComplete?.();
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

  const viewMoreLabel = `View more${totalCount > previewCount ? ` (${totalCount - previewCount} more)` : ''}`;

  function renderViewMoreButton(className?: string) {
    if (viewMoreHref && totalCount > 0) {
      return (
        <Button variant="ghost" size="sm" className={className ?? 'text-xs'} asChild>
          <Link href={viewMoreHref}>{viewMoreLabel}</Link>
        </Button>
      );
    }
    if (!hasMore) return null;
    return (
      <Button variant="ghost" size="sm" className={className ?? 'text-xs'} onClick={() => setModalOpen(true)}>
        {viewMoreLabel}
      </Button>
    );
  }

  if (totalCount === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-4">
        {!hideHeader && (
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            {hasMore && renderViewMoreButton()}
          </div>
        )}
        {hideHeader && (hasMore || (viewMoreHref && totalCount > 0)) && (
          <div className="flex justify-end">{renderViewMoreButton()}</div>
        )}

        <TypeSection
          label="Therapy Booking"
          bookings={previewTherapy}
          showPendingActions={showPendingActions}
          onComplete={handleComplete}
          onDismiss={openDismissDialog}
          onClick={openDetail}
          completingBookingId={completingBookingId}
          actionBusy={Boolean(completingBookingId)}
        />
        <TypeSection
          label="Consultation Booking"
          bookings={previewConsultation}
          showPendingActions={showPendingActions}
          onComplete={handleComplete}
          onDismiss={openDismissDialog}
          onClick={openDetail}
          completingBookingId={completingBookingId}
          actionBusy={Boolean(completingBookingId)}
        />
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>{title}</DialogTitle>
            <p className="text-sm text-muted-foreground">{totalCount} appointment{totalCount !== 1 ? 's' : ''}</p>
          </DialogHeader>
          <div className="border-b px-6 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <TypeSection
              label="Therapy Booking"
              bookings={filteredModal.therapy}
              showPendingActions={showPendingActions}
              onComplete={handleComplete}
              onDismiss={openDismissDialog}
              onClick={openDetail}
              completingBookingId={completingBookingId}
              actionBusy={Boolean(completingBookingId)}
            />
            <TypeSection
              label="Consultation Booking"
              bookings={filteredModal.consultation}
              showPendingActions={showPendingActions}
              onComplete={handleComplete}
              onDismiss={openDismissDialog}
              onClick={openDetail}
              completingBookingId={completingBookingId}
              actionBusy={Boolean(completingBookingId)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>What would you like to do?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {actionTarget ? getPatientName(actionTarget.patient) : 'This booking'} needs your action.
          </p>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              disabled={Boolean(completingBookingId)}
              onClick={() => {
                if (!actionTarget) return;
                setActionDialogOpen(false);
                setSelectedBooking(actionTarget);
                setRescheduleOpen(true);
              }}
            >
              Postpone
            </Button>
            <Button
              variant="destructive"
              disabled={Boolean(completingBookingId)}
              onClick={() => {
                if (!actionTarget) return;
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

      <BookingDetailDialog
        booking={selectedBooking}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onReschedule={
          showPostponeCancel
            ? () => {
                setDetailOpen(false);
                setRescheduleOpen(true);
              }
            : undefined
        }
        onCancel={
          showPostponeCancel
            ? () => {
                setDetailOpen(false);
                setCancelOpen(true);
              }
            : undefined
        }
        viewerRole={viewerRole}
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
          onActionComplete?.();
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
          const whatsapp = await notifyAfterBookingAction({
            booking: updated,
            eventType: 'CANCELLED',
          });
          showBookingAction({
            action: 'cancel',
            booking: updated,
            cancellationReason: reason,
            whatsapp,
          });
          onActionComplete?.();
        }}
      />
    </>
  );
}
