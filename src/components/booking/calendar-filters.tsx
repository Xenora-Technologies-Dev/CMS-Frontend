'use client';

import { cn, formatDate, formatDateInput, parseDateInput } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import type { ReactNode } from 'react';

interface CalendarFiltersProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  className?: string;
  /** Shown on the Date card header row (e.g. Refresh / Create Booking). */
  headerActions?: ReactNode;
}

export function CalendarFilters({
  selectedDate,
  onDateChange,
  className,
  headerActions,
}: CalendarFiltersProps) {
  function shiftDate(days: number) {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + days);
    onDateChange(next);
  }

  const dateLabel = formatDate(selectedDate);

  return (
    <aside className={cn('flex flex-col rounded-lg border bg-white', className)}>
      <div className="flex items-center gap-2 border-b px-3 py-2.5 sm:px-4 sm:py-3">
        <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-slate-900">Date</h2>
        {headerActions ? (
          <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
            {headerActions}
          </div>
        ) : null}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => shiftDate(-1)}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="date"
            value={formatDateInput(selectedDate)}
            onChange={(e) => onDateChange(parseDateInput(e.target.value))}
            className="h-8 flex-1 text-sm"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => shiftDate(1)}
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{dateLabel}</p>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => onDateChange(new Date())}
        >
          Today
        </Button>
      </div>
    </aside>
  );
}
