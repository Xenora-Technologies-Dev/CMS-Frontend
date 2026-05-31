'use client';

import {
  buildSlotOccupancyPreview,
  getPreviewTimeBounds,
  getSlotPosition,
  type SlotValidationInput,
  type SlotValidationIssue,
} from '@/lib/booking-validation';
import { cn, formatTime } from '@/lib/utils';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';

interface SlotOccupancyPreviewProps {
  input: SlotValidationInput;
  issues: SlotValidationIssue[];
}

export function SlotOccupancyPreview({ input, issues }: SlotOccupancyPreviewProps) {
  const previewItems = useMemo(() => buildSlotOccupancyPreview(input), [input]);
  const bounds = useMemo(() => getPreviewTimeBounds(), []);

  const hasErrors = issues.some((issue) => issue.type === 'error');
  const isReady = Boolean(
    input.date &&
      input.startTime &&
      input.durationMinutes &&
      input.therapistId &&
      input.roomId,
  );

  if (!isReady) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Select therapist, room, therapy, date, and time to preview slot occupancy.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">Slot Occupancy Preview</p>
        {!hasErrors ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Available
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            Conflicts detected
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
          <span>08:00</span>
          <span>18:00</span>
        </div>
        <div className="relative h-10 rounded-md border bg-white">
          {previewItems.map((item) => {
            const position = getSlotPosition(
              item.startTime,
              item.endTime,
              bounds.dayStart,
              bounds.dayEnd,
            );
            return (
              <div
                key={item.id}
                className={cn(
                  'absolute top-1 h-8 rounded px-1 text-[10px] leading-8 truncate',
                  item.kind === 'proposed' &&
                    (hasErrors
                      ? 'bg-red-100 text-red-800 ring-2 ring-red-400'
                      : 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-400'),
                  item.kind === 'therapist' &&
                    (item.conflict ? 'bg-amber-200 text-amber-900' : 'bg-blue-100 text-blue-900'),
                  item.kind === 'room' &&
                    (item.conflict ? 'bg-orange-200 text-orange-900' : 'bg-violet-100 text-violet-900'),
                )}
                style={{ left: `${position.left}%`, width: `${position.width}%` }}
                title={`${item.label} (${formatTime(item.startTime)}–${formatTime(item.endTime)})`}
              >
                {item.kind === 'proposed' ? 'Proposed' : item.label}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {previewItems
          .filter((item) => item.kind !== 'proposed')
          .slice(0, 4)
          .map((item) => (
            <div
              key={item.id}
              className={cn(
                'rounded-md border px-2 py-1.5 text-xs',
                item.conflict ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white',
              )}
            >
              <p className="font-medium truncate">{item.label}</p>
              <p className="text-muted-foreground">
                {formatTime(item.startTime)} – {formatTime(item.endTime)}
                {item.conflict ? ' · Overlap' : ''}
              </p>
            </div>
          ))}
      </div>

      {issues.length > 0 && (
        <div className="space-y-1.5">
          {issues.map((issue, index) => (
            <p
              key={`${issue.message}-${index}`}
              className={cn(
                'text-xs',
                issue.type === 'error' ? 'text-destructive' : 'text-amber-700',
              )}
            >
              {issue.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
