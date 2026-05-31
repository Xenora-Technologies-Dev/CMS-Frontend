'use client';

import { LeaveStatusBadge } from '@/components/leave/leave-status-badge';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { ProgressDialog } from '@/components/shared/progress-dialog';
import type { PaginatedMeta } from '@/lib/types';
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
  listLeaveRequests,
  rejectLeaveRequest,
  type LeaveRequest,
  type LeaveRequestStatus,
} from '@/lib/leave-api';
import { getFriendlyErrorMessage } from '@/lib/error-utils';
import { getTherapistName } from '@/lib/utils';
import { Check, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSocketEvent } from '@/components/providers/socket-provider';
import { SocketEvents } from '@/lib/socket-events';

export function AdminLeaveManagement() {
  const { progress, run } = useProgressAction();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<LeaveRequestStatus | 'ALL'>('PENDING');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginatedMeta>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useSocketEvent<LeaveRequest>(SocketEvents.LEAVE_UPDATED, () => {
    void load();
  });

  async function handleApprove(leave: LeaveRequest) {
    setProcessingId(leave.id);
    setError(null);
    try {
      await run('Approving leave…', async () => {
        await approveLeaveRequest(leave.id);
        await load();
      }, `Processing request for ${getTherapistName(leave.therapist)}`);
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
        await load();
      }, `Updating request for ${getTherapistName(rejectTarget.therapist)}`);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to reject leave request'));
    } finally {
      setProcessingId(null);
    }
  }

  function formatDateRange(start: string, end: string) {
    const s = new Date(start).toLocaleDateString('en-GB');
    const e = new Date(end).toLocaleDateString('en-GB');
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
        <p className="text-sm text-muted-foreground">Review and approve therapist leave requests</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as LeaveRequestStatus | 'ALL');
            setPage(1);
          }}
          disabled={loading || progress.open}
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
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading leave requests…
            </div>
          ) : leaves.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No leave requests found</p>
          ) : (
            <div className="space-y-3">
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
                        {formatDateRange(leave.startDate, leave.endDate)}
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
                          onClick={() => void handleApprove(leave)}
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
    </div>
  );
}
