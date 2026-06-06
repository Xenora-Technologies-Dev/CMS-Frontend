'use client';

import { PageActions } from '@/components/shared/page-actions';
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
import { createRoom, getRoom, updateRoom } from '@/lib/room-api';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface RoomFormProps {
  mode: 'create' | 'edit';
  roomId?: string;
}

export function RoomForm({ mode, roomId }: RoomFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    code: '',
    roomType: 'THERAPY' as 'THERAPY' | 'CONSULTATION',
    floor: '',
    capacity: '1',
    equipment: '',
    notes: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const { room } = await getRoom(roomId);
      setForm({
        name: room.name,
        code: room.code ?? '',
        roomType: room.roomType ?? 'THERAPY',
        floor: room.floor ?? '',
        capacity: String(room.capacity ?? 1),
        equipment: room.equipment ?? '',
        notes: room.notes ?? '',
        isActive: room.isActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load room');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (mode === 'edit') void load();
  }, [mode, load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      roomType: form.roomType,
      floor: form.floor.trim() || undefined,
      capacity: parseInt(form.capacity, 10) || 1,
      equipment: form.equipment.trim() || undefined,
      notes: form.notes.trim() || undefined,
      ...(mode === 'edit' && { isActive: form.isActive }),
    };
    try {
      if (mode === 'create') {
        await createRoom(payload);
        router.push('/admin/rooms');
      } else if (roomId) {
        await updateRoom(roomId, payload);
        router.push('/admin/rooms');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save room');
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading room…</p>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageActions
        backHref="/admin/rooms"
        backLabel="← Back"
        title={mode === 'create' ? 'Add Room' : 'Edit Room'}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Room details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Room name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Room code</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="e.g. R-101"
              />
            </div>
            <div className="space-y-2">
              <Label>Room type *</Label>
              <Select
                value={form.roomType}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, roomType: v as 'THERAPY' | 'CONSULTATION' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="THERAPY">Therapy</SelectItem>
                  <SelectItem value="CONSULTATION">Consultation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="floor">Floor</Label>
                <Input
                  id="floor"
                  value={form.floor}
                  onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="equipment">Equipment</Label>
              <Input
                id="equipment"
                value={form.equipment}
                onChange={(e) => setForm((f) => ({ ...f, equipment: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            {mode === 'edit' && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.isActive ? 'active' : 'inactive'}
                  onValueChange={(v) => setForm((f) => ({ ...f, isActive: v === 'active' }))}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : mode === 'create' ? 'Create room' : 'Save changes'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/admin/rooms')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
