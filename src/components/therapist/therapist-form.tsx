'use client';

import { PageActions } from '@/components/shared/page-actions';
import { PasswordInput } from '@/components/shared/password-input';
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
import {
  createTherapist,
  getTherapist,
  updateTherapist,
  type CreatedTherapistUser,
} from '@/lib/therapist-api';
import { storeTherapistPassword } from '@/components/therapist/therapist-password-panel';
import { resetUserPassword } from '@/lib/user-api';
import { getErrorMessage } from '@/lib/validation-errors';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface TherapistFormProps {
  mode: 'create' | 'edit';
  therapistId?: string;
}

const emptyCreate = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phone: '',
  licenseNumber: '',
  specialization: '',
  bio: '',
  colorCode: '#3B82F6',
  consultationStartTime: '09:00',
  consultationEndTime: '17:00',
};

const emptyEdit = {
  licenseNumber: '',
  specialization: '',
  bio: '',
  colorCode: '#3B82F6',
  consultationStartTime: '09:00',
  consultationEndTime: '17:00',
  isActive: true,
  newPassword: '',
  confirmPassword: '',
};

export function TherapistForm({ mode, therapistId }: TherapistFormProps) {
  const router = useRouter();
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [editForm, setEditForm] = useState(emptyEdit);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!therapistId) return;
    setLoading(true);
    try {
      const { therapist } = await getTherapist(therapistId);
      setUserId(therapist.user.id);
      setEditForm({
        licenseNumber: therapist.licenseNumber ?? '',
        specialization: therapist.specialization ?? '',
        bio: therapist.bio ?? '',
        colorCode: therapist.colorCode ?? '#3B82F6',
        consultationStartTime: therapist.consultationStartTime ?? '09:00',
        consultationEndTime: therapist.consultationEndTime ?? '17:00',
        isActive: therapist.isActive,
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load therapist');
    } finally {
      setLoading(false);
    }
  }, [therapistId]);

  useEffect(() => {
    if (mode === 'edit') void load();
  }, [mode, load]);

  function normalizeColorCode(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '#3B82F6';
    return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  }

  function normalizeTime(value: string): string {
    const match = value.trim().match(/^(\d{1,2}):([0-5]\d)$/);
    if (!match) return value.trim();
    return `${String(Number.parseInt(match[1], 10)).padStart(2, '0')}:${match[2]}`;
  }

  function validateCreateForm(): string | null {
    const phone = createForm.phone.trim();
    if (phone.length > 0 && phone.length < 5) {
      return 'Phone must be at least 5 characters when provided';
    }
    const password = createForm.password;
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter';
    if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter';
    if (!/[0-9]/.test(password)) return 'Password must include a number';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (mode === 'create') {
        const validationError = validateCreateForm();
        if (validationError) {
          setError(validationError);
          setSaving(false);
          return;
        }
        const result = await createTherapist({
          email: createForm.email.trim(),
          password: createForm.password,
          firstName: createForm.firstName.trim(),
          lastName: createForm.lastName.trim(),
          phone: createForm.phone.trim() || undefined,
          licenseNumber: createForm.licenseNumber.trim() || undefined,
          specialization: createForm.specialization.trim() || undefined,
          bio: createForm.bio.trim() || undefined,
          colorCode: normalizeColorCode(createForm.colorCode),
          consultationStartTime: normalizeTime(createForm.consultationStartTime),
          consultationEndTime: normalizeTime(createForm.consultationEndTime),
        });
        const user: CreatedTherapistUser = result.user;
        storeTherapistPassword(user.id, createForm.password);
        const id = user.therapistId ?? user.id;
        router.push(`/admin/therapists/${id}`);
      } else if (therapistId) {
        if (editForm.newPassword) {
          if (editForm.newPassword !== editForm.confirmPassword) {
            setError('Passwords do not match');
            setSaving(false);
            return;
          }
          if (!userId) {
            setError('Unable to reset password');
            setSaving(false);
            return;
          }
          await resetUserPassword(userId, editForm.newPassword);
          storeTherapistPassword(userId, editForm.newPassword);
        }
        await updateTherapist(therapistId, {
          licenseNumber: editForm.licenseNumber.trim() || undefined,
          specialization: editForm.specialization.trim() || undefined,
          bio: editForm.bio.trim() || undefined,
          colorCode: editForm.colorCode,
          consultationStartTime: editForm.consultationStartTime,
          consultationEndTime: editForm.consultationEndTime,
          isActive: editForm.isActive,
        });
        router.push(`/admin/therapists/${therapistId}`);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save therapist'));
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading therapist…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageActions
        backHref={
          mode === 'edit' && therapistId ? `/admin/therapists/${therapistId}` : '/admin/therapists'
        }
        backLabel="← Back"
        title={mode === 'create' ? 'Add Therapist' : 'Edit Therapist'}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === 'create' ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Account</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="password">Password *</Label>
                  <PasswordInput
                    id="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-muted-foreground">
                    At least 8 characters with uppercase, lowercase, and a number.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name *</Label>
                  <Input
                    id="firstName"
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name *</Label>
                  <Input
                    id="lastName"
                    value={createForm.lastName}
                    onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>
            <TherapistDetailsFields
              values={createForm}
              onChange={(patch) => setCreateForm((f) => ({ ...f, ...patch }))}
            />
          </>
        ) : (
          <>
            <TherapistDetailsFields
              values={editForm}
              onChange={(patch) => setEditForm((f) => ({ ...f, ...patch }))}
              showStatus
            />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reset password (optional)</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="newPassword">New password</Label>
                  <PasswordInput
                    id="newPassword"
                    value={editForm.newPassword}
                    onChange={(e) => setEditForm((f) => ({ ...f, newPassword: e.target.value }))}
                    minLength={8}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <PasswordInput
                    id="confirmPassword"
                    value={editForm.confirmPassword}
                    onChange={(e) => setEditForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    minLength={8}
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : mode === 'create' ? 'Create therapist' : 'Save changes'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

function TherapistDetailsFields({
  values,
  onChange,
  showStatus,
}: {
  values: {
    licenseNumber: string;
    specialization: string;
    bio: string;
    colorCode: string;
    consultationStartTime: string;
    consultationEndTime: string;
    isActive?: boolean;
  };
  onChange: (patch: Partial<typeof values>) => void;
  showStatus?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Professional details</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="specialization">Specialization</Label>
          <Input
            id="specialization"
            value={values.specialization}
            onChange={(e) => onChange({ specialization: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="licenseNumber">License number</Label>
          <Input
            id="licenseNumber"
            value={values.licenseNumber}
            onChange={(e) => onChange({ licenseNumber: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="colorCode">Color code</Label>
          <div className="flex gap-2">
            <Input
              id="colorCode"
              value={values.colorCode}
              onChange={(e) => onChange({ colorCode: e.target.value })}
              placeholder="#3B82F6"
            />
            <input
              type="color"
              value={values.colorCode}
              onChange={(e) => onChange({ colorCode: e.target.value })}
              className="h-10 w-12 cursor-pointer rounded border"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="consultationStart">Consultation start</Label>
          <Input
            id="consultationStart"
            type="time"
            value={values.consultationStartTime}
            onChange={(e) => onChange({ consultationStartTime: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="consultationEnd">Consultation end</Label>
          <Input
            id="consultationEnd"
            type="time"
            value={values.consultationEndTime}
            onChange={(e) => onChange({ consultationEndTime: e.target.value })}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            rows={3}
            value={values.bio}
            onChange={(e) => onChange({ bio: e.target.value })}
          />
        </div>
        {showStatus && values.isActive !== undefined && (
          <div className="space-y-2 sm:col-span-2">
            <Label>Status</Label>
            <Select
              value={values.isActive ? 'active' : 'inactive'}
              onValueChange={(v) => onChange({ isActive: v === 'active' })}
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
  );
}
