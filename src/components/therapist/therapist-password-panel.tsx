'use client';

import { PasswordInput } from '@/components/shared/password-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { resetUserPassword } from '@/lib/user-api';
import { KeyRound } from 'lucide-react';
import { useEffect, useState } from 'react';

const STORAGE_PREFIX = 'clinic_therapist_pwd_';

export function getStoredTherapistPassword(userId: string): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(`${STORAGE_PREFIX}${userId}`);
}

export function storeTherapistPassword(userId: string, password: string) {
  sessionStorage.setItem(`${STORAGE_PREFIX}${userId}`, password);
}

export function clearStoredTherapistPassword(userId: string) {
  sessionStorage.removeItem(`${STORAGE_PREFIX}${userId}`);
}

interface TherapistPasswordPanelProps {
  userId: string;
  email: string;
}

export function TherapistPasswordPanel({ userId, email }: TherapistPasswordPanelProps) {
  const [storedPassword, setStoredPassword] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setStoredPassword(getStoredTherapistPassword(userId));
  }, [userId]);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      await resetUserPassword(userId, newPassword);
      storeTherapistPassword(userId, newPassword);
      setStoredPassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4" />
          Account password (admin only)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {storedPassword && (
          <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <Label>Current / initial password</Label>
            <p className="text-xs text-amber-800">
              Shown for admin reference. Stored locally after create or reset until cleared.
            </p>
            <PasswordInput value={storedPassword} readOnly containerClassName="max-w-md" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                clearStoredTherapistPassword(userId);
                setStoredPassword(null);
              }}
            >
              Clear from view
            </Button>
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4 max-w-md">
          <p className="text-sm text-muted-foreground">
            Reset login password for <span className="font-medium">{email}</span>
          </p>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password *</Label>
            <PasswordInput
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password *</Label>
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-emerald-700">{success}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? 'Updating…' : 'Reset password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
