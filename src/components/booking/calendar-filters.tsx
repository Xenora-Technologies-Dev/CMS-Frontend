'use client';

import type { Room, Therapist } from '@/lib/types';
import { cn, formatDateInput, getTherapistColor, getTherapistName, parseDateInput } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';

interface CalendarFiltersProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  therapists: Therapist[];
  rooms: Room[];
  selectedTherapistIds: string[];
  selectedRoomIds: string[];
  onTherapistToggle: (id: string) => void;
  onRoomToggle: (id: string) => void;
  onClearFilters: () => void;
  primaryTherapistId?: string;
  onPrimaryTherapistChange?: (id: string) => void;
  lockTherapistFilter?: boolean;
  className?: string;
}

export function CalendarFilters({
  selectedDate,
  onDateChange,
  therapists,
  rooms,
  selectedTherapistIds,
  selectedRoomIds,
  onTherapistToggle,
  onRoomToggle,
  onClearFilters,
  primaryTherapistId = 'all',
  onPrimaryTherapistChange,
  lockTherapistFilter = false,
  className,
}: CalendarFiltersProps) {
  const hasActiveFilters =
    selectedTherapistIds.length > 0 || selectedRoomIds.length > 0;

  function shiftDate(days: number) {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + days);
    onDateChange(next);
  }

  const dateLabel = selectedDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <aside
      className={cn(
        'flex flex-col rounded-lg border bg-white',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onClearFilters}
          >
            <X className="mr-1 h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Date
          </p>
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

        <Separator />

        {onPrimaryTherapistChange && therapists.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              View therapist
            </p>
            <Select
              value={primaryTherapistId}
              onValueChange={onPrimaryTherapistChange}
              disabled={lockTherapistFilter}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All therapists" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All therapists</SelectItem>
                {therapists.map((therapist) => (
                  <SelectItem key={therapist.id} value={therapist.id}>
                    {getTherapistName(therapist)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Therapists
          </p>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {therapists.length === 0 ? (
              <p className="text-xs text-muted-foreground">No therapists available</p>
            ) : (
              therapists.map((therapist) => {
                const selected = selectedTherapistIds.includes(therapist.id);
                return (
                  <button
                    key={therapist.id}
                    type="button"
                    onClick={() => onTherapistToggle(therapist.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                      selected
                        ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                        : 'hover:bg-slate-50',
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: getTherapistColor(therapist.colorCode) }}
                    />
                    <span className="truncate">{getTherapistName(therapist)}</span>
                  </button>
                );
              })
            )}
          </div>
          {selectedTherapistIds.length > 0 && (
            <p className="text-[10px] text-muted-foreground">
              Showing {selectedTherapistIds.length} of {therapists.length} therapists
            </p>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Rooms
          </p>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {rooms.length === 0 ? (
              <p className="text-xs text-muted-foreground">No rooms available</p>
            ) : (
              rooms.map((room) => {
                const selected = selectedRoomIds.includes(room.id);
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => onRoomToggle(room.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                      selected
                        ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                        : 'hover:bg-slate-50',
                    )}
                  >
                    <span className="truncate font-medium">{room.name}</span>
                    {room.code && (
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {room.code}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
          {selectedRoomIds.length > 0 && (
            <p className="text-[10px] text-muted-foreground">
              Showing {selectedRoomIds.length} of {rooms.length} rooms
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
