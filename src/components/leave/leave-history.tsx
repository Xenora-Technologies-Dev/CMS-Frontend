'use client';

import { LeaveStatusBadge } from '@/components/leave/leave-status-badge';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { ProgressDialog } from '@/components/shared/progress-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useProgressAction } from '@/hooks/use-progress-action';
import {
  cancelLeaveRequest,
  listLeaveRequests,
  updateLeaveRequest,
  type LeaveHistoryScope,
  type LeaveRequest,
} from '@/lib/leave-api';
import { listTherapists } from '@/lib/therapist-api';
import { getFriendlyErrorMessage } from '@/lib/error-utils';
import type { PaginatedMeta, Therapist } from '@/lib/types';
import {
  combineDateAndTime,
  endOfDay,
  formatDateInput,
  formatDateTime,
  getTherapistName,
  parseDateInput,
  startOfDay,
  toTimeInputValue,
} from '@/lib/utils';
import { Loader2, Pencil, RefreshCw, Search, X } from 'lucide-react';
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
  showAdminActions?: boolean;
  processingId?: string | null;
  onModify?: (leave: LeaveRequest) => void;
  onCancel?: (leave: LeaveRequest) => void;
  reloadToken?: number;
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
  showAdminActions = false,
  processingId = null,
  onModify,
  onCancel,
  reloadToken = 0,
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
  }, [page, limit, scope, viewerRole, therapistFilter, dateFrom, dateTo, search, reloadToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const colSpan =
    (viewerRole === 'admin' ? 6 : 4) + (showAdminActions ? 1 : 0);

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
                {showAdminActions && <th className="px-3 py-2.5 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="px-3 py-10 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading…
                    </span>
                  </td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-3 py-10 text-center text-muted-foreground">
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
                    {showAdminActions && (
                      <td className="px-3 py-3">
                        {(leave.status === 'PENDING' || leave.status === 'APPROVED') && (
                          <div className="flex flex-col gap-1.5 sm:flex-row">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onModify?.(leave)}
                              disabled={processingId === leave.id}
                            >
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Modify
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => onCancel?.(leave)}
                              disabled={processingId === leave.id}
                            >
                              <X className="mr-1 h-3.5 w-3.5" />
                              Cancel
                            </Button>
                          </div>
                        )}
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
  const { progress, run } = useProgressAction();
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [therapistFilter, setTherapistFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [actionError, setActionError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [modifyTarget, setModifyTarget] = useState<LeaveRequest | null>(null);
  const [modifyStartDate, setModifyStartDate] = useState('');
  const [modifyStartTime, setModifyStartTime] = useState('09:00');
  const [modifyEndDate, setModifyEndDate] = useState('');
  const [modifyEndTime, setModifyEndTime] = useState('17:00');
  const [modifyIsFullDay, setModifyIsFullDay] = useState(false);
  const [modifyReason, setModifyReason] = useState('');
  const [modifyAdminNotes, setModifyAdminNotes] = useState('');

  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null);

  const isAdmin = viewerRole === 'admin';

  function refreshSections() {
    setReloadToken((token) => token + 1);
  }

  function openModifyDialog(leave: LeaveRequest) {
    setActionError(null);
    setModifyTarget(leave);
    setModifyStartDate(formatDateInput(new Date(leave.startDateTime)));
    setModifyEndDate(formatDateInput(new Date(leave.endDateTime)));
    setModifyStartTime(toTimeInputValue(leave.startDateTime));
    setModifyEndTime(toTimeInputValue(leave.endDateTime));
    setModifyIsFullDay(leave.isFullDay);
    setModifyReason(leave.reason);
    setModifyAdminNotes(leave.adminNotes ?? '');
  }

  async function handleModify() {
    if (!modifyTarget || !modifyReason.trim()) return;
    setProcessingId(modifyTarget.id);
    setActionError(null);
    try {
      const startDateTime = modifyIsFullDay
        ? startOfDay(parseDateInput(modifyStartDate)).toISOString()
        : combineDateAndTime(parseDateInput(modifyStartDate), modifyStartTime).toISOString();
      const endDateTime = modifyIsFullDay
        ? endOfDay(parseDateInput(modifyEndDate || modifyStartDate)).toISOString()
        : combineDateAndTime(parseDateInput(modifyEndDate), modifyEndTime).toISOString();

      if (new Date(endDateTime) < new Date(startDateTime)) {
        setActionError('End date/time must be on or after start date/time');
        setProcessingId(null);
        return;
      }

      await run(
        'Updating leave…',
        async () => {
          await updateLeaveRequest(modifyTarget.id, {
            startDateTime,
            endDateTime,
            isFullDay: modifyIsFullDay,
            reason: modifyReason.trim(),
            adminNotes: modifyAdminNotes.trim() || undefined,
          });
          setModifyTarget(null);
          refreshSections();
        },
        `Updating leave for ${getTherapistName(modifyTarget.therapist)}`,
      );
    } catch (err) {
      setActionError(getFriendlyErrorMessage(err, 'Failed to update leave request'));
    } finally {
      setProcessingId(null);
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    setProcessingId(cancelTarget.id);
    setActionError(null);
    try {
      await run(
        'Cancelling leave…',
        async () => {
          await cancelLeaveRequest(cancelTarget.id);
          setCancelTarget(null);
          refreshSections();
        },
        `Cancelling leave for ${getTherapistName(cancelTarget.therapist)}`,
      );
    } catch (err) {
      setActionError(getFriendlyErrorMessage(err, 'Failed to cancel leave request'));
    } finally {
      setProcessingId(null);
    }
  }

  function formatLeaveRange(start: string, end: string) {
    const s = formatDateTime(start);
    const e = formatDateTime(end);
    return s === e ? s : `${s} – ${e}`;
  }

  useEffect(() => {
    if (viewerRole !== 'admin') return;
    void listTherapists({ limit: 100, isActive: true }).then((result) => {
      setTherapists(result.data);
    });
  }, [viewerRole]);

  return (
    <div className="space-y-6">
      <ProgressDialog
        open={progress.open}
        title={progress.title}
        description={progress.description}
      />

      {actionError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {actionError}
        </div>
      )}

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
          showAdminActions={isAdmin && (section.scope === 'upcoming' || section.scope === 'today')}
          processingId={processingId}
          onModify={isAdmin ? openModifyDialog : undefined}
          onCancel={isAdmin ? setCancelTarget : undefined}
          reloadToken={reloadToken}
        />
      ))}

      <Dialog
        open={!!modifyTarget}
        onOpenChange={(o) => {
          if (!o && !progress.open) setModifyTarget(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modify Leave</DialogTitle>
          </DialogHeader>
          {modifyTarget && (
            <div className="grid gap-4">
              <p className="text-sm text-muted-foreground">
                {getTherapistName(modifyTarget.therapist)}
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={modifyIsFullDay}
                  onChange={(e) => setModifyIsFullDay(e.target.checked)}
                  disabled={progress.open}
                />
                Full day leave
              </label>
              <div className="space-y-2">
                <Label>Start date{modifyIsFullDay ? '' : ' & time'} *</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    type="date"
                    value={modifyStartDate}
                    onChange={(e) => {
                      setModifyStartDate(e.target.value);
                      if (modifyIsFullDay && !modifyEndDate) setModifyEndDate(e.target.value);
                    }}
                    required
                    disabled={progress.open}
                  />
                  {!modifyIsFullDay && (
                    <Input
                      type="time"
                      value={modifyStartTime}
                      onChange={(e) => setModifyStartTime(e.target.value)}
                      required
                      disabled={progress.open}
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>End date{modifyIsFullDay ? '' : ' & time'} *</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    type="date"
                    value={modifyIsFullDay ? modifyEndDate || modifyStartDate : modifyEndDate}
                    onChange={(e) => setModifyEndDate(e.target.value)}
                    min={modifyStartDate}
                    required
                    disabled={progress.open}
                  />
                  {!modifyIsFullDay && (
                    <Input
                      type="time"
                      value={modifyEndTime}
                      onChange={(e) => setModifyEndTime(e.target.value)}
                      required
                      disabled={progress.open}
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="historyModifyReason">Reason *</Label>
                <Textarea
                  id="historyModifyReason"
                  value={modifyReason}
                  onChange={(e) => setModifyReason(e.target.value)}
                  required
                  minLength={3}
                  disabled={progress.open}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="historyModifyAdminNotes">Admin notes</Label>
                <Textarea
                  id="historyModifyAdminNotes"
                  value={modifyAdminNotes}
                  onChange={(e) => setModifyAdminNotes(e.target.value)}
                  disabled={progress.open}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setModifyTarget(null)}
              disabled={progress.open}
            >
              Close
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={() => void handleModify()}
              disabled={progress.open || !modifyReason.trim()}
            >
              {progress.open ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!cancelTarget}
        onOpenChange={(o) => {
          if (!o && !progress.open) setCancelTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Leave</DialogTitle>
          </DialogHeader>
          {cancelTarget && (
            <p className="text-sm text-muted-foreground">
              Cancel leave for {getTherapistName(cancelTarget.therapist)} on{' '}
              {formatLeaveRange(cancelTarget.startDateTime, cancelTarget.endDateTime)}? Slots will
              become available again for booking.
            </p>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setCancelTarget(null)}
              disabled={progress.open}
            >
              Keep leave
            </Button>
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={() => void handleCancel()}
              disabled={progress.open}
            >
              {progress.open ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling…
                </>
              ) : (
                'Cancel leave'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
