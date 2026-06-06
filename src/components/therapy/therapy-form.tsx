'use client';

import { DurationBadge } from '@/components/shared/duration-badge';
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
import { createTherapy, getTherapy, updateTherapy } from '@/lib/therapy-api';
import { getErrorMessage } from '@/lib/validation-errors';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface TherapyFormProps {
  mode: 'create' | 'edit';
  therapyId?: string;
}

export function TherapyForm({ mode, therapyId }: TherapyFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    durationMinutes: '60',
    price: '',
    currency: 'AED',
    isActive: true,
    isPackageBased: false,
    packageSessions: '',
    packageValidityDays: '',
    packageDescription: '',
  });
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!therapyId) return;
    setLoading(true);
    try {
      const { therapy } = await getTherapy(therapyId);
      setForm({
        name: therapy.name,
        code: therapy.code ?? '',
        description: therapy.description ?? '',
        durationMinutes: String(therapy.durationMinutes),
        price: therapy.price != null ? String(therapy.price) : '',
        currency: therapy.currency ?? 'AED',
        isActive: therapy.isActive,
        isPackageBased: therapy.isPackageBased ?? false,
        packageSessions: therapy.packageSessions != null ? String(therapy.packageSessions) : '',
        packageValidityDays:
          therapy.packageValidityDays != null ? String(therapy.packageValidityDays) : '',
        packageDescription: therapy.packageDescription ?? '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load therapy');
    } finally {
      setLoading(false);
    }
  }, [therapyId]);

  useEffect(() => {
    if (mode === 'edit') void load();
  }, [mode, load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const duration = parseInt(form.durationMinutes, 10);
    if (Number.isNaN(duration) || duration < 5) {
      setError('Duration must be at least 5 minutes');
      return;
    }
    setSaving(true);
    setError(null);
    let price: number | undefined;
    if (form.price.trim()) {
      price = parseFloat(form.price);
      if (Number.isNaN(price) || price < 0) {
        setError('Cost must be a valid positive number');
        setSaving(false);
        return;
      }
    }

    let packageSessions: number | undefined;
    let packageValidityDays: number | undefined;
    if (form.isPackageBased) {
      packageSessions = parseInt(form.packageSessions, 10);
      packageValidityDays = parseInt(form.packageValidityDays, 10);
      if (Number.isNaN(packageSessions) || packageSessions < 1) {
        setError('Number of sessions is required for package-based therapies');
        setSaving(false);
        return;
      }
      if (Number.isNaN(packageValidityDays) || packageValidityDays < 1) {
        setError('Package validity (days) is required for package-based therapies');
        setSaving(false);
        return;
      }
    }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      description: form.description.trim() || undefined,
      durationMinutes: duration,
      price,
      currency: form.currency,
      isPackageBased: form.isPackageBased,
      ...(form.isPackageBased && {
        packageSessions,
        packageValidityDays,
        packageDescription: form.packageDescription.trim() || undefined,
      }),
      ...(mode === 'edit' && { isActive: form.isActive }),
    };
    try {
      if (mode === 'create') {
        await createTherapy(payload);
        router.push('/admin/therapies');
      } else if (therapyId) {
        await updateTherapy(therapyId, payload);
        router.push('/admin/therapies');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save therapy'));
      setSaving(false);
    }
  }

  const durationNum = parseInt(form.durationMinutes, 10);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading therapy…</p>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageActions
        backHref="/admin/therapies"
        backLabel="← Back"
        title={mode === 'create' ? 'Add Therapy' : 'Edit Therapy'}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Therapy details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Therapy name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes) *</Label>
              <Input
                id="duration"
                type="number"
                min={5}
                max={480}
                step={5}
                value={form.durationMinutes}
                onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                required
              />
              {!Number.isNaN(durationNum) && durationNum >= 5 && (
                <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 p-3">
                  <DurationBadge minutes={durationNum} />
                  <p className="text-xs text-muted-foreground">
                    Appointments will be scheduled for this length when this therapy is selected.
                  </p>
                </div>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Cost</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AED">AED</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Is Package Based?</Label>
              <Select
                value={form.isPackageBased ? 'yes' : 'no'}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    isPackageBased: v === 'yes',
                    ...(v === 'no' && {
                      packageSessions: '',
                      packageValidityDays: '',
                      packageDescription: '',
                    }),
                  }))
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.isPackageBased && (
              <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-medium text-slate-900">Package configuration</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="packageSessions">Number of sessions *</Label>
                    <Input
                      id="packageSessions"
                      type="number"
                      min={1}
                      max={100}
                      value={form.packageSessions}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, packageSessions: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="packageValidityDays">Package validity (days) *</Label>
                    <Input
                      id="packageValidityDays"
                      type="number"
                      min={1}
                      max={3650}
                      value={form.packageValidityDays}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, packageValidityDays: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="packageDescription">Package description</Label>
                  <Textarea
                    id="packageDescription"
                    rows={2}
                    value={form.packageDescription}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, packageDescription: e.target.value }))
                    }
                    placeholder="e.g. 10 sessions over 60 days"
                  />
                </div>
              </div>
            )}
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
            {saving ? 'Saving…' : mode === 'create' ? 'Create therapy' : 'Save changes'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/admin/therapies')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
