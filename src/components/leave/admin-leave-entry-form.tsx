'use client';

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
import { Textarea } from '@/components/ui/textarea';
import { createLeaveRequest } from '@/lib/leave-api';
import { getFriendlyErrorMessage } from '@/lib/error-utils';
import type { Therapist } from '@/lib/types';
import { combineDateAndTime, endOfDay, getTherapistName, parseDateInput, startOfDay } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

interface AdminLeaveEntryFormProps {
  therapists: Therapist[];
  onSuccess?: (result: { affectedCount: number }) => void;
}

export function AdminLeaveEntryForm({ therapists, onSuccess }: AdminLeaveEntryFormProps) {
  const [therapistId, setTherapistId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('17:00');
  const [isFullDay, setIsFullDay] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const startDateTime = isFullDay
        ? startOfDay(parseDateInput(startDate)).toISOString()
        : combineDateAndTime(parseDateInput(startDate), startTime).toISOString();
      const endDateTime = isFullDay
        ? endOfDay(parseDateInput(endDate || startDate)).toISOString()
        : combineDateAndTime(parseDateInput(endDate), endTime).toISOString();

      if (new Date(endDateTime) < new Date(startDateTime)) {
        setError('End date/time must be on or after start date/time');
        setSaving(false);
        return;
      }

      const result = await createLeaveRequest({
        therapistId,
        startDateTime,
        endDateTime,
        isFullDay,
        reason: reason.trim(),
      });

      setTherapistId('');
      setStartDate('');
      setStartTime('09:00');
      setEndDate('');
      setEndTime('17:00');
      setIsFullDay(false);
      setReason('');

      const affectedCount = result.affectedBookings?.length ?? 0;
      setSuccess(
        affectedCount > 0
          ? `Leave recorded and approved. ${affectedCount} appointment(s) need attention below.`
          : 'Leave recorded and approved immediately.',
      );
      onSuccess?.({ affectedCount });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to create leave entry'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Manual Leave Entry</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Admin leave entries are approved immediately — no further confirmation required.
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Therapist *</Label>
            <Select value={therapistId || undefined} onValueChange={setTherapistId}>
              <SelectTrigger>
                <SelectValue placeholder="Select therapist" />
              </SelectTrigger>
              <SelectContent>
                {therapists.map((therapist) => (
                  <SelectItem key={therapist.id} value={therapist.id}>
                    {getTherapistName(therapist)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isFullDay}
                onChange={(e) => setIsFullDay(e.target.checked)}
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
              />
              {!isFullDay && (
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
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
              />
              {!isFullDay && (
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
              )}
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="adminReason">Reason *</Label>
            <Textarea
              id="adminReason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Emergency Leave, Medical Leave"
              required
              minLength={3}
            />
          </div>
          {success && (
            <p className="text-sm text-emerald-700 sm:col-span-2" role="status">
              {success}
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive sm:col-span-2" role="alert">
              {error}
            </p>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving || !therapistId}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create & approve leave'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
