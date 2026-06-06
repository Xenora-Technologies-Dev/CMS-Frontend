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
import { combineDateAndTime, endOfDay, parseDateInput, startOfDay } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

interface LeaveRequestFormProps {
  onSuccess?: (result: { affectedCount: number }) => void;
}

export function LeaveRequestForm({ onSuccess }: LeaveRequestFormProps) {
  const { progress, run } = useProgressAction();
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('17:00');
  const [isFullDay, setIsFullDay] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const startDateTime = isFullDay
        ? startOfDay(parseDateInput(startDate)).toISOString()
        : combineDateAndTime(parseDateInput(startDate), startTime).toISOString();
      const endDateTime = isFullDay
        ? endOfDay(parseDateInput(endDate || startDate)).toISOString()
        : combineDateAndTime(parseDateInput(endDate), endTime).toISOString();

      if (new Date(endDateTime) < new Date(startDateTime)) {
        setError('End date/time must be on or after start date/time');
        return;
      }

      await run(
        'Submitting leave request…',
        async () => {
          const result = await createLeaveRequest({
            startDateTime,
            endDateTime,
            isFullDay,
            reason: reason.trim(),
          });
          setStartDate('');
          setStartTime('09:00');
          setEndDate('');
          setEndTime('17:00');
          setIsFullDay(false);
          setReason('');
          onSuccess?.({ affectedCount: result.affectedBookings?.length ?? 0 });
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
            <div className="space-y-2 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isFullDay}
                  onChange={(e) => setIsFullDay(e.target.checked)}
                  disabled={progress.open}
                />
                Full day leave
              </label>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Start date{isFullDay ? '' : ' & time'} *</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (isFullDay && !endDate) setEndDate(e.target.value);
                  }}
                  required
                  disabled={progress.open}
                />
                {!isFullDay && (
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    disabled={progress.open}
                  />
                )}
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>End date{isFullDay ? '' : ' & time'} *</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  type="date"
                  value={isFullDay ? endDate || startDate : endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  required
                  disabled={progress.open}
                />
                {!isFullDay && (
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    disabled={progress.open}
                  />
                )}
              </div>
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
