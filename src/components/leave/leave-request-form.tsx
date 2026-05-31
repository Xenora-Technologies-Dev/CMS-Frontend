'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ProgressDialog } from '@/components/shared/progress-dialog';
import { useProgressAction } from '@/hooks/use-progress-action';
import { createLeaveRequest } from '@/lib/leave-api';
import { getFriendlyErrorMessage } from '@/lib/error-utils';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

interface LeaveRequestFormProps {
  onSuccess?: () => void;
}

export function LeaveRequestForm({ onSuccess }: LeaveRequestFormProps) {
  const { progress, run } = useProgressAction();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await run(
        'Submitting leave request…',
        async () => {
          await createLeaveRequest({ startDate, endDate, reason: reason.trim() });
          setStartDate('');
          setEndDate('');
          setReason('');
          onSuccess?.();
        },
        'Sending your request to the clinic admin',
      );
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to submit leave request'));
    }
  }

  return (
    <>
      <ProgressDialog
        open={progress.open}
        title={progress.title}
        description={progress.description}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request Leave</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start date *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                disabled={progress.open}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End date *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                required
                disabled={progress.open}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the reason for your leave request"
                required
                minLength={3}
                disabled={progress.open}
              />
            </div>
            {error && (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive sm:col-span-2"
              >
                {error}
              </div>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={progress.open} className="w-full sm:w-auto">
                {progress.open ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Submit leave request'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
