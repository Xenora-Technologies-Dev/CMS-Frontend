'use client';

import { LeaveRequestForm } from '@/components/leave/leave-request-form';
import { LeaveStatusBadge } from '@/components/leave/leave-status-badge';
import { BookingsNeedsAttentionPanel } from '@/components/booking/bookings-needs-attention-panel';
import { useSocketEvent } from '@/components/providers/socket-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cancelLeaveRequest, listLeaveRequests, type LeaveRequest } from '@/lib/leave-api';
import { SocketEvents } from '@/lib/socket-events';
import { getFriendlyErrorMessage } from '@/lib/error-utils';
import { formatDateTime } from '@/lib/utils';
import { ProgressDialog } from '@/components/shared/progress-dialog';
import { useProgressAction } from '@/hooks/use-progress-action';
import { useAuth } from '@/components/auth/auth-provider';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export function TherapistLeaveManagement() {
  const { user } = useAuth();
  const { progress, run } = useProgressAction();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.therapistId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listLeaveRequests({ limit: 50 });
      setLeaves(result.data);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to load leave requests'));
    } finally {
      setLoading(false);
    }
  }, [user?.therapistId]);

  useEffect(() => {
    void load();
  }, [load]);

  useSocketEvent<LeaveRequest>(SocketEvents.LEAVE_UPDATED, (leave) => {
    if (leave.therapistId !== user?.therapistId) return;
    setLeaves((prev) => {
      const without = prev.filter((l) => l.id !== leave.id);
      return [leave, ...without].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    });
  });

  async function handleCancel(id: string) {
    setCancellingId(id);
    setError(null);
    try {
      await run('Cancelling leave request…', async () => {
        await cancelLeaveRequest(id);
        await load();
      });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to cancel leave request'));
    } finally {
      setCancellingId(null);
    }
  }

  function formatDateRange(start: string, end: string) {
    const s = formatDateTime(start);
    const e = formatDateTime(end);
    return s === e ? s : `${s} – ${e}`;
  }

  if (!user?.therapistId && !loading) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Your account is not linked to a therapist profile. Contact your administrator.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProgressDialog open={progress.open} title={progress.title} description={progress.description} />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
        <p className="text-sm text-muted-foreground">Submit and manage your leave requests</p>
      </div>

      {conflictNotice && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>{conflictNotice}</p>
        </div>
      )}

      <BookingsNeedsAttentionPanel />

      <LeaveRequestForm
        onSuccess={({ affectedCount }) => {
          void load();
          if (affectedCount > 0) {
            setConflictNotice(
              `Your leave overlaps ${affectedCount} active appointment(s). Postpone or cancel each booking below before your leave starts.`,
            );
          } else {
            setConflictNotice(null);
          }
        }}
      />

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
          <CardTitle className="text-base">My Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : leaves.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No leave requests yet</p>
          ) : (
            <div className="space-y-3">
              {leaves.map((leave) => (
                <div
                  key={leave.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {formatDateRange(leave.startDateTime, leave.endDateTime)}
                        {leave.isFullDay ? ' · Full day' : ''}
                      </p>
                      <LeaveStatusBadge status={leave.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{leave.reason}</p>
                    {leave.adminNotes && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Admin notes: {leave.adminNotes}
                      </p>
                    )}
                  </div>
                  {leave.status === 'PENDING' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => void handleCancel(leave.id)}
                      disabled={cancellingId === leave.id || progress.open}
                    >
                      {cancellingId === leave.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cancelling…
                        </>
                      ) : (
                        'Cancel request'
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
