'use client';

import type { AvailableSlot, AvailableWindow } from '@/lib/booking-validation';
import { cn, formatDuration, formatTimeInputValue } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface AvailableSlotsPickerProps {
  windows: AvailableWindow[];
  slots: AvailableSlot[];
  durationMinutes: number;
  value?: string;
  onChange: (startTime: string) => void;
  loading?: boolean;
  /** e.g. "therapist" or "doctor" for empty-state copy */
  resourceLabel?: string;
}

export function AvailableSlotsPicker({
  windows,
  slots,
  durationMinutes,
  value,
  onChange,
  loading,
  resourceLabel = 'therapist',
}: AvailableSlotsPickerProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading available slots…
      </div>
    );
  }

  if (windows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        No open periods for this {resourceLabel} on the selected date.
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        No slots fit a {formatDuration(durationMinutes)} session in the open periods.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-slate-50/80 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-800">Available slots</p>
        <span className="text-xs text-muted-foreground">{formatDuration(durationMinutes)} each</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {windows.map((window) => (
          <span
            key={`${window.start}-${window.end}`}
            className="rounded-full border bg-white px-2 py-0.5 text-[11px] text-muted-foreground"
          >
            Open {formatTimeInputValue(window.start)}–{formatTimeInputValue(window.end)}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {slots.map((slot) => (
          <Button
            key={slot.startTime}
            type="button"
            size="sm"
            variant={value === slot.startTime ? 'default' : 'outline'}
            className={cn(
              'h-9 justify-center px-2 text-xs font-medium',
              value === slot.startTime && 'shadow-sm',
            )}
            onClick={() => onChange(slot.startTime)}
          >
            {slot.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
