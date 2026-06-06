import type { ActivityItem } from '@/lib/dashboard-api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarCheck, CalendarPlus, CalendarX, Clock } from 'lucide-react';

const ICONS = {
  create: CalendarPlus,
  booking: CalendarPlus,
  cancel: CalendarX,
  complete: CalendarCheck,
} as const;

const COLORS = {
  create: 'bg-blue-100 text-blue-700',
  booking: 'bg-blue-100 text-blue-700',
  cancel: 'bg-red-100 text-red-700',
  complete: 'bg-emerald-100 text-emerald-700',
} as const;

interface RecentActivityProps {
  items: ActivityItem[];
}

export function RecentActivity({ items }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No recent activity</p>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => {
              const Icon = ICONS[item.type] ?? Clock;
              return (
                <li key={`${item.id}-${item.type}`} className="flex gap-3">
                  <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', COLORS[item.type])}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{item.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {new Date(item.timestamp).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
