'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  createPublicHoliday,
  deletePublicHoliday,
  listPublicHolidays,
  updatePublicHoliday,
} from '@/lib/holiday-api';
import type { PublicHoliday } from '@/lib/types';
import { formatDateTime } from '@/lib/appointment-list-utils';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const emptyForm = {
  name: '',
  startDate: '',
  startTime: '00:00',
  endDate: '',
  endTime: '23:59',
  isFullDay: true,
  notes: '',
};

function toLocalDateTimeInput(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { date, time };
}

function combineLocalDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function PublicHolidayManagement() {
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listPublicHolidays({ limit: 200 });
      setHolidays(
        [...result.data].sort(
          (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load holidays');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  function startCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(holiday: PublicHoliday) {
    const start = toLocalDateTimeInput(holiday.startDateTime);
    const end = toLocalDateTimeInput(holiday.endDateTime);
    setForm({
      name: holiday.name,
      startDate: start.date,
      startTime: start.time,
      endDate: end.date,
      endTime: end.time,
      isFullDay: holiday.isFullDay,
      notes: holiday.notes ?? '',
    });
    setEditingId(holiday.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Holiday name is required');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      startDateTime: combineLocalDateTime(form.startDate, form.startTime),
      endDateTime: combineLocalDateTime(form.endDate, form.endTime),
      isFullDay: form.isFullDay,
      notes: form.notes.trim() || undefined,
    };
    try {
      if (editingId) {
        await updatePublicHoliday(editingId, payload);
      } else {
        await createPublicHoliday(payload);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save holiday');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this public holiday?')) return;
    setError(null);
    try {
      await deletePublicHoliday(id);
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete holiday');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add holiday
        </Button>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? 'Edit holiday' : 'New holiday'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="holiday-name">Name *</Label>
                <Input
                  id="holiday-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="full-day"
                  type="checkbox"
                  checked={form.isFullDay}
                  onChange={(e) => setForm((f) => ({ ...f, isFullDay: e.target.checked }))}
                  className="h-4 w-4 rounded border"
                />
                <Label htmlFor="full-day" className="font-normal">
                  Full day
                </Label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start date *</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start time</Label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    disabled={form.isFullDay}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End date *</Label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>End time</Label>
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    disabled={form.isFullDay}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="holiday-notes">Notes</Label>
                <Textarea
                  id="holiday-notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create holiday'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium">Full day</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                      Loading holidays…
                    </td>
                  </tr>
                ) : holidays.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                      No public holidays configured
                    </td>
                  </tr>
                ) : (
                  holidays.map((holiday) => (
                    <tr key={holiday.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{holiday.name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDateTime(holiday.startDateTime)} – {formatDateTime(holiday.endDateTime)}
                      </td>
                      <td className="px-4 py-3">{holiday.isFullDay ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(holiday)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => void handleDelete(holiday.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
