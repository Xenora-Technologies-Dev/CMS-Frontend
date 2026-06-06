import type { BookingStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

const STATUS_VARIANT: Record<
  BookingStatus,
  'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'muted'
> = {
  SCHEDULED: 'default',
  CONFIRMED: 'secondary',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
  RESCHEDULED: 'muted',
  NO_SHOW: 'destructive',
  PENDING_CONFIRMATION: 'warning',
};

const STATUS_LABEL: Partial<Record<BookingStatus, string>> = {
  PENDING_CONFIRMATION: 'Pending Confirmation',
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const label = STATUS_LABEL[status] ?? status.replace(/_/g, ' ');
  const isPendingConfirmation = status === 'PENDING_CONFIRMATION';

  return (
    <Badge
      variant={STATUS_VARIANT[status]}
      className={
        isPendingConfirmation
          ? 'shrink-0 border-orange-300 bg-orange-100 font-bold text-orange-800 ring-1 ring-orange-400/60'
          : 'shrink-0'
      }
    >
      {label}
    </Badge>
  );
}
