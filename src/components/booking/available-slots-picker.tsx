'use client';

import type { AvailableWindow, ScheduleSlot } from '@/lib/booking-validation';
import { cn, formatDuration, formatTimeInputValue } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';

interface AvailableSlotsPickerProps {
  windows: AvailableWindow[];
  slots: ScheduleSlot[];
  durationMinutes: number;
  value?: string;
  onChange: (startTime: string) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** e.g. "therapist" or "doctor" for empty-state copy */
  resourceLabel?: string;
}

function SlotLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3.5 w-8 rounded border-2 border-primary bg-primary shadow-sm" aria-hidden />
        Selected
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="h-3.5 w-8 rounded border border-slate-200 bg-white shadow-sm"
          aria-hidden
        />
        Available
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="h-3.5 w-8 rounded border border-slate-200 bg-slate-100 opacity-70"
          aria-hidden
        />
        Unavailable
      </span>
    </div>
  );
}

export function AvailableSlotsPicker({
  windows,
  slots,
  durationMinutes,
  value,
  onChange,
  refreshing,
  onRefresh,
  resourceLabel = 'therapist',
}: AvailableSlotsPickerProps) {
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
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-800">Available slots</p>
          <SlotLegend />
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            {onRefresh && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={onRefresh}
                disabled={refreshing}
                aria-label="Refresh available slots"
              >
                <RefreshCw className={cn('mr-1 h-3.5 w-3.5', refreshing && 'animate-spin')} />
                Refresh
              </Button>
            )}
          </div>
          {refreshing && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Updating slots…
            </span>
          )}
          <span className="text-xs text-muted-foreground">{formatDuration(durationMinutes)} each</span>
        </div>
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
        {slots.map((slot) => {
          const isSelected = value === slot.startTime;
          const isAvailable = slot.available;

          return (
            <Button
              key={slot.startTime}
              type="button"
              size="sm"
              variant={isSelected ? 'default' : 'outline'}
              disabled={!isAvailable}
              className={cn(
                'h-9 justify-center px-2 text-xs font-medium',
                isSelected && 'shadow-sm',
                !isAvailable &&
                  'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-70 hover:bg-slate-100 hover:text-slate-400',
              )}
              onClick={() => {
                if (isAvailable) onChange(slot.startTime);
              }}
            >
              {slot.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
