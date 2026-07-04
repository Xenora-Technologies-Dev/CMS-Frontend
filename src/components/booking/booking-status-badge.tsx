import type { BookingStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

const STATUS_LABEL_COMPACT: Partial<Record<BookingStatus, string>> = {
  PENDING_CONFIRMATION: 'Pending',
  IN_PROGRESS: 'In Progress',
};

interface BookingStatusBadgeProps {
  status: BookingStatus;
  compact?: boolean;
}

export function BookingStatusBadge({ status, compact = false }: BookingStatusBadgeProps) {
  const label = compact
    ? (STATUS_LABEL_COMPACT[status] ??
      STATUS_LABEL[status] ??
      status.replace(/_/g, ' '))
    : (STATUS_LABEL[status] ?? status.replace(/_/g, ' '));
  const isPendingConfirmation = status === 'PENDING_CONFIRMATION';

  return (
    <Badge
      variant={STATUS_VARIANT[status]}
      className={cn(
        compact &&
          'max-w-full whitespace-normal px-1 py-0 text-[9px] font-semibold leading-tight sm:px-1.5 sm:text-[10px]',
        !compact && 'shrink-0',
        isPendingConfirmation &&
          'border-orange-300 bg-orange-100 font-bold text-orange-800 ring-1 ring-orange-400/60',
      )}
    >
      {label}
    </Badge>
  );
}
