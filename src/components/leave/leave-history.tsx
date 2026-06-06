'use client';

import { LeaveStatusBadge } from '@/components/leave/leave-status-badge';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { listLeaveRequests, type LeaveHistoryScope, type LeaveRequest } from '@/lib/leave-api';
import { listTherapists } from '@/lib/therapist-api';
import { getFriendlyErrorMessage } from '@/lib/error-utils';
import type { PaginatedMeta, Therapist } from '@/lib/types';
import { endOfDay, formatDateTime, getTherapistName, parseDateInput, startOfDay } from '@/lib/utils';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface LeaveHistoryProps {
  viewerRole: 'admin' | 'therapist';
}

const DEFAULT_META: PaginatedMeta = { page: 1, limit: 20, total: 0, totalPages: 0 };

const SECTIONS: {
  scope: LeaveHistoryScope;
  title: string;
  description: string;
  defaultLimit: number;
}[] = [
  {
    scope: 'upcoming',
    title: 'Upcoming Leaves',
    description: 'Approved and pending leave starting after today.',
    defaultLimit: 10,
  },
  {
    scope: 'today',
    title: "Today's Leaves",
    description: 'Leave periods overlapping today.',
    defaultLimit: 10,
  },
  {
    scope: 'past',
    title: 'Past Leaves',
    description: 'Historical leave records with pagination.',
    defaultLimit: 20,
  },
];

function formatLeavePeriod(leave: LeaveRequest) {
  const start = formatDateTime(leave.startDateTime);
  const end = formatDateTime(leave.endDateTime);
  return start === end ? start : `${start} – ${end}`;
}

interface LeaveHistorySectionProps {
  scope: LeaveHistoryScope;
  title: string;
  description: string;
  defaultLimit: number;
  viewerRole: 'admin' | 'therapist';
  therapistFilter: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

function LeaveHistorySection({
  scope,
  title,
  description,
  defaultLimit,
  viewerRole,
  therapistFilter,
  dateFrom,
  dateTo,
  search,
}: LeaveHistorySectionProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(defaultLimit);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta>(DEFAULT_META);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listLeaveRequests({
        page,
        limit,
        scope,
        therapistId: viewerRole === 'admin' && therapistFilter ? therapistFilter : undefined,
        dateFrom: dateFrom ? startOfDay(parseDateInput(dateFrom)).toISOString() : undefined,
        dateTo: dateTo ? endOfDay(parseDateInput(dateTo)).toISOString() : undefined,
        search: viewerRole === 'admin' && search ? search : undefined,
      });
      setLeaves(result.data);
      setMeta(result.meta);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to load leave records'));
      setLeaves([]);
      setMeta(DEFAULT_META);
    } finally {
      setLoading(false);
    }
  }, [page, limit, scope, viewerRole, therapistFilter, dateFrom, dateTo, search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [therapistFilter, dateFrom, dateTo, search, scope]);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-muted-foreground">
              <tr>
                {viewerRole === 'admin' && <th className="px-3 py-2.5 font-medium">Therapist</th>}
                <th className="px-3 py-2.5 font-medium">Period</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Type</th>
                <th className="px-3 py-2.5 font-medium">Reason</th>
                {viewerRole === 'admin' && <th className="px-3 py-2.5 font-medium">Approved By</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={viewerRole === 'admin' ? 6 : 4}
                    className="px-3 py-10 text-center text-muted-foreground"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading…
                    </span>
                  </td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td
                    colSpan={viewerRole === 'admin' ? 6 : 4}
                    className="px-3 py-10 text-center text-muted-foreground"
                  >
                    No leave records in this section.
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => (
                  <tr key={leave.id} className="border-b last:border-b-0">
                    {viewerRole === 'admin' && (
                      <td className="px-3 py-3 font-medium text-slate-900">
                        {getTherapistName(leave.therapist)}
                      </td>
                    )}
                    <td className="px-3 py-3 text-slate-700">{formatLeavePeriod(leave)}</td>
                    <td className="px-3 py-3">
                      <LeaveStatusBadge status={leave.status} />
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {leave.isFullDay ? 'Full day' : 'Partial'}
                    </td>
                    <td className="max-w-xs px-3 py-3 text-slate-700">{leave.reason}</td>
                    {viewerRole === 'admin' && (
                      <td className="px-3 py-3 text-muted-foreground">
                        {leave.approvedBy
                          ? `${leave.approvedBy.firstName} ${leave.approvedBy.lastName}`
                          : '—'}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {(scope === 'past' || meta.total > limit) && (
          <PaginationControls
            meta={{ ...meta, page, limit }}
            onPageChange={setPage}
            onLimitChange={(value) => {
              setLimit(value);
              setPage(1);
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

export function LeaveHistory({ viewerRole }: LeaveHistoryProps) {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [therapistFilter, setTherapistFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    if (viewerRole !== 'admin') return;
    void listTherapists({ limit: 100, isActive: true }).then((result) => {
      setTherapists(result.data);
    });
  }, [viewerRole]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leave History</h1>
        <p className="text-sm text-muted-foreground">
          {viewerRole === 'admin'
            ? 'Browse upcoming, today’s, and past therapist leave records.'
            : 'Browse your upcoming, today’s, and past leave records.'}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {viewerRole === 'admin' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="leaveSearch">Search therapist</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="leaveSearch"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name…"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Therapist</Label>
                <Select
                  value={therapistFilter || 'ALL'}
                  onValueChange={(v) => setTherapistFilter(v === 'ALL' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All therapists" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All therapists</SelectItem>
                    {therapists.map((therapist) => (
                      <SelectItem key={therapist.id} value={therapist.id}>
                        {getTherapistName(therapist)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="leaveDateFrom">From date</Label>
            <Input
              id="leaveDateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="leaveDateTo">To date</Label>
            <Input
              id="leaveDateTo"
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          {(dateFrom || dateTo || therapistFilter || search) && (
            <div className="flex items-end sm:col-span-2 lg:col-span-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                  setTherapistFilter('');
                  setSearch('');
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {SECTIONS.map((section) => (
        <LeaveHistorySection
          key={section.scope}
          {...section}
          viewerRole={viewerRole}
          therapistFilter={therapistFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
          search={debouncedSearch}
        />
      ))}
    </div>
  );
}
