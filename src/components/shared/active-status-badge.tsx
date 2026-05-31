import { Badge } from '@/components/ui/badge';

export function ActiveStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? 'success' : 'muted'}>{isActive ? 'Active' : 'Inactive'}</Badge>
  );
}
