'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { QuickFilter, StatusGroupFilter, Therapist, Therapy } from '@/lib/types';
import { cn } from '@/lib/utils';
import { RefreshCw, X } from 'lucide-react';

const QUICK_FILTERS: { value: QuickFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_GROUPS: { value: StatusGroupFilter | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RESCHEDULED', label: 'Rescheduled' },
];

export interface AppointmentListFiltersState {
  patientName: string;
  patientPhone: string;
  therapistId: string;
  therapyId: string;
  statusGroup: StatusGroupFilter | 'ALL';
  dateFrom: string;
  dateTo: string;
  quickFilter: QuickFilter;
}

interface AppointmentListFiltersProps {
  filters: AppointmentListFiltersState;
  therapists: Therapist[];
  therapies: Therapy[];
  loading?: boolean;
  onChange: (filters: AppointmentListFiltersState) => void;
  onRefresh: () => void;
  onClear: () => void;
}

export function AppointmentListFilters({
  filters,
  therapists,
  therapies,
  loading,
  onChange,
  onRefresh,
  onClear,
}: AppointmentListFiltersProps) {
  function patch(partial: Partial<AppointmentListFiltersState>) {
    onChange({ ...filters, ...partial });
  }

  return (
    <div className="space-y-4 rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={onRefresh} aria-label="Refresh">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => patch({ quickFilter: item.value })}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filters.quickFilter === item.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="patientName">Patient Name</Label>
          <Input
            id="patientName"
            placeholder="Search name…"
            value={filters.patientName}
            onChange={(e) => patch({ patientName: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="patientPhone">Mobile Number</Label>
          <Input
            id="patientPhone"
            placeholder="Search phone…"
            value={filters.patientPhone}
            onChange={(e) => patch({ patientPhone: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Therapist</Label>
          <Select
            value={filters.therapistId || 'all'}
            onValueChange={(v) => patch({ therapistId: v === 'all' ? '' : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All therapists" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All therapists</SelectItem>
              {therapists.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.user?.firstName} {t.user?.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Therapy</Label>
          <Select
            value={filters.therapyId || 'all'}
            onValueChange={(v) => patch({ therapyId: v === 'all' ? '' : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All therapies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All therapies</SelectItem>
              {therapies.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={filters.statusGroup}
            onValueChange={(v) =>
              patch({ statusGroup: v as StatusGroupFilter | 'ALL' })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_GROUPS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dateFrom">Date From</Label>
          <Input
            id="dateFrom"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => patch({ dateFrom: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dateTo">Date To</Label>
          <Input
            id="dateTo"
            type="date"
            value={filters.dateTo}
            onChange={(e) => patch({ dateTo: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

export const DEFAULT_APPOINTMENT_FILTERS: AppointmentListFiltersState = {
  patientName: '',
  patientPhone: '',
  therapistId: '',
  therapyId: '',
  statusGroup: 'ALL',
  dateFrom: '',
  dateTo: '',
  quickFilter: 'all',
};

/** Statuses hidden from default appointment list (superseded / inactive bookings). */
export const DEFAULT_EXCLUDED_APPOINTMENT_STATUSES = [
  'RESCHEDULED',
  'CANCELLED',
  'NO_SHOW',
] as const;
