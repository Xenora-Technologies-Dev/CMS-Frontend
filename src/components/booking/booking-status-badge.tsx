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
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className="shrink-0">
      {status.replace('_', ' ')}
    </Badge>
  );
}
