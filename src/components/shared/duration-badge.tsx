import { Badge } from '@/components/ui/badge';
import { formatDuration } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface DurationBadgeProps {
  minutes: number;
  className?: string;
}

export function DurationBadge({ minutes, className }: DurationBadgeProps) {
  return (
    <Badge variant="secondary" className={className}>
      <Clock className="mr-1 h-3 w-3" />
      {formatDuration(minutes)}
    </Badge>
  );
}
