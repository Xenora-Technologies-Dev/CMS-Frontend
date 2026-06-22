'use client';

import { AdminLeaveEntryForm } from '@/components/leave/admin-leave-entry-form';
import { BookingsNeedsAttentionPanel } from '@/components/booking/bookings-needs-attention-panel';
import { LeaveStatusBadge } from '@/components/leave/leave-status-badge';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { ProgressDialog } from '@/components/shared/progress-dialog';
import type { PaginatedMeta, Therapist } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useProgressAction } from '@/hooks/use-progress-action';
import {
  approveLeaveRequest,
  cancelLeaveRequest,
  listLeaveRequests,
  rejectLeaveRequest,
  updateLeaveRequest,
  type LeaveRequest,
  type LeaveRequestStatus,
} from '@/lib/leave-api';
import { listTherapists } from '@/lib/therapist-api';
import { getFriendlyErrorMessage } from '@/lib/error-utils';
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
import { Check, Loader2, Pencil, X } from 'lucide-react';
import { useBackgroundLoadState } from '@/hooks/use-background-load-state';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { useCallback, useEffect, useState } from 'react';
import { useSocketEvent } from '@/components/providers/socket-provider';
import { SocketEvents } from '@/lib/socket-events';

export function AdminLeaveManagement() {
  const { progress, run } = useProgressAction();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [statusFilter, setStatusFilter] = useState<LeaveRequestStatus | 'ALL'>('PENDING');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginatedMeta>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const { initialLoading, refreshing, beginLoad, endLoad } = useBackgroundLoadState();
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  const [modifyTarget, setModifyTarget] = useState<LeaveRequest | null>(null);
  const [modifyStartDate, setModifyStartDate] = useState('');
  const [modifyStartTime, setModifyStartTime] = useState('09:00');
  const [modifyEndDate, setModifyEndDate] = useState('');
  const [modifyEndTime, setModifyEndTime] = useState('17:00');
  const [modifyIsFullDay, setModifyIsFullDay] = useState(false);
  const [modifyReason, setModifyReason] = useState('');
  const [modifyAdminNotes, setModifyAdminNotes] = useState('');

  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null);

  const load = useCallback(async (options?: { background?: boolean }) => {
    beginLoad(options);
    setError(null);
    try {
      const result = await listLeaveRequests({
        page,
        limit: 15,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      setLeaves(result.data);
      setMeta(result.meta);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to load leave requests'));
    } finally {
      endLoad();
    }
  }, [page, statusFilter, beginLoad, endLoad]);

  const debouncedBackgroundReload = useDebouncedCallback(
    () => void load({ background: true }),
    600,
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void listTherapists({ limit: 100, isActive: true }).then((result) => {
      setTherapists(result.data);
    });
  }, []);

  useSocketEvent<LeaveRequest>(SocketEvents.LEAVE_UPDATED, debouncedBackgroundReload);

  useSocketEvent(SocketEvents.LEAVE_CONFLICT, debouncedBackgroundReload);

  async function handleApproveClick(leave: LeaveRequest) {
    setProcessingId(leave.id);
    setError(null);
    try {
      await run(
        'Approving leave…',
        async () => {
          await approveLeaveRequest(leave.id);
          await load({ background: true });
        },
        `Processing request for ${getTherapistName(leave.therapist)}`,
      );
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to approve leave request'));
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject() {
    if (!rejectTarget || !rejectNotes.trim()) return;
    setProcessingId(rejectTarget.id);
    setError(null);
    try {
      await run('Rejecting leave…', async () => {
        await rejectLeaveRequest(rejectTarget.id, rejectNotes.trim());
        setRejectTarget(null);
        setRejectNotes('');
        await load({ background: true });
      }, `Updating request for ${getTherapistName(rejectTarget.therapist)}`);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to reject leave request'));
    } finally {
      setProcessingId(null);
    }
  }

  function openModifyDialog(leave: LeaveRequest) {
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
    setError(null);
    try {
      const startDateTime = modifyIsFullDay
        ? startOfDay(parseDateInput(modifyStartDate)).toISOString()
        : combineDateAndTime(parseDateInput(modifyStartDate), modifyStartTime).toISOString();
      const endDateTime = modifyIsFullDay
        ? endOfDay(parseDateInput(modifyEndDate || modifyStartDate)).toISOString()
        : combineDateAndTime(parseDateInput(modifyEndDate), modifyEndTime).toISOString();

      if (new Date(endDateTime) < new Date(startDateTime)) {
        setError('End date/time must be on or after start date/time');
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
          await load({ background: true });
        },
        `Updating leave for ${getTherapistName(modifyTarget.therapist)}`,
      );
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to update leave request'));
    } finally {
      setProcessingId(null);
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    setProcessingId(cancelTarget.id);
    setError(null);
    try {
      await run(
        'Cancelling leave…',
        async () => {
          await cancelLeaveRequest(cancelTarget.id);
          setCancelTarget(null);
          await load({ background: true });
        },
        `Cancelling leave for ${getTherapistName(cancelTarget.therapist)}`,
      );
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to cancel leave request'));
    } finally {
      setProcessingId(null);
    }
  }

  function formatLeaveRange(start: string, end: string) {
    const s = formatDateTime(start);
    const e = formatDateTime(end);
    return s === e ? s : `${s} – ${e}`;
  }

  return (
    <div className="space-y-6">
      <ProgressDialog
        open={progress.open}
        title={progress.title}
        description={progress.description}
      />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
        <p className="text-sm text-muted-foreground">
          Review pending requests, enter leave, and resolve booking conflicts
        </p>
      </div>

      <AdminLeaveEntryForm therapists={therapists} onSuccess={() => void load()} />

      <BookingsNeedsAttentionPanel />

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as LeaveRequestStatus | 'ALL');
            setPage(1);
          }}
          disabled={initialLoading || refreshing || progress.open}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {initialLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading leave requests…
            </div>
          ) : leaves.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No leave requests found</p>
          ) : (
            <div className={`space-y-3 transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
              {leaves.map((leave) => {
                const isProcessing = processingId === leave.id;
                return (
                  <div
                    key={leave.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          {getTherapistName(leave.therapist)}
                        </p>
                        <LeaveStatusBadge status={leave.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatLeaveRange(leave.startDateTime, leave.endDateTime)}
                        {leave.isFullDay ? ' · Full day' : ''}
                      </p>
                      <p className="mt-1 text-sm text-slate-700">{leave.reason}</p>
                      {leave.adminNotes && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Admin notes: {leave.adminNotes}
                        </p>
                      )}
                    </div>
                    {leave.status === 'PENDING' && (
                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                        <Button
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => void handleApproveClick(leave)}
                          disabled={isProcessing || progress.open}
                        >
                          {isProcessing ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="mr-1 h-4 w-4" />
                          )}
                          {isProcessing ? 'Approving…' : 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => openModifyDialog(leave)}
                          disabled={isProcessing || progress.open}
                        >
                          <Pencil className="mr-1 h-4 w-4" />
                          Modify
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full sm:w-auto"
                          onClick={() => setRejectTarget(leave)}
                          disabled={isProcessing || progress.open}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                    {leave.status === 'APPROVED' && (
                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => openModifyDialog(leave)}
                          disabled={isProcessing || progress.open}
                        >
                          <Pencil className="mr-1 h-4 w-4" />
                          Modify
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full sm:w-auto"
                          onClick={() => setCancelTarget(leave)}
                          disabled={isProcessing || progress.open}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Cancel leave
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <PaginationControls meta={meta} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => {
          if (!o && !progress.open) {
            setRejectTarget(null);
            setRejectNotes('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rejectNotes">Rejection reason *</Label>
            <Textarea
              id="rejectNotes"
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Provide a reason for rejection"
              required
              disabled={progress.open}
            />
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setRejectTarget(null)}
              disabled={progress.open}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={() => void handleReject()}
              disabled={progress.open || !rejectNotes.trim()}
            >
              {progress.open ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting…
                </>
              ) : (
                'Reject request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <Label htmlFor="modifyReason">Reason *</Label>
                <Textarea
                  id="modifyReason"
                  value={modifyReason}
                  onChange={(e) => setModifyReason(e.target.value)}
                  required
                  minLength={3}
                  disabled={progress.open}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modifyAdminNotes">Admin notes</Label>
                <Textarea
                  id="modifyAdminNotes"
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
            <DialogTitle>Cancel Approved Leave</DialogTitle>
          </DialogHeader>
          {cancelTarget && (
            <p className="text-sm text-muted-foreground">
              Cancel approved leave for {getTherapistName(cancelTarget.therapist)} on{' '}
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
