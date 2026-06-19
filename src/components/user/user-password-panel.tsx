'use client';

import { PasswordInput } from '@/components/shared/password-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { getUser, resetUserPassword } from '@/lib/user-api';
import { KeyRound, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface UserPasswordPanelProps {
  userId: string;
  email: string;
}

export function UserPasswordPanel({ userId, email }: UserPasswordPanelProps) {
  const [managedPassword, setManagedPassword] = useState<string | null | undefined>(undefined);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadPassword = useCallback(async () => {
    try {
      const { user } = await getUser(userId);
      setManagedPassword(user.managedPassword ?? null);
    } catch {
      setManagedPassword(null);
    }
  }, [userId]);

  useEffect(() => {
    void loadPassword();
  }, [loadPassword]);

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
      setManagedPassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password updated — visible to all admins');
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
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <Label>Current / initial password</Label>
          {managedPassword === undefined ? (
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : managedPassword ? (
            <>
              <p className="text-xs text-amber-800">
                Visible to all clinic admins. Updated when the account is created or password is
                reset.
              </p>
              <PasswordInput value={managedPassword} readOnly containerClassName="max-w-md" />
            </>
          ) : (
            <p className="text-xs text-amber-800">
              No password on record. Reset below to store it for admin reference.
            </p>
          )}
        </div>

        <form onSubmit={handleReset} className="max-w-md space-y-4">
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

/** @deprecated Use UserPasswordPanel */
export const TherapistPasswordPanel = UserPasswordPanel;
