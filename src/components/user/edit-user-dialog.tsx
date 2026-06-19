'use client';

import { PasswordInput } from '@/components/shared/password-input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isValidUaeMobile } from '@/lib/uae-phone';
import { resetUserPassword, updateUser } from '@/lib/user-api';
import type { UserListItem } from '@/lib/types';
import { useEffect, useState } from 'react';

interface EditUserDialogProps {
  user: UserListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function roleLabel(role: UserListItem['role']) {
  if (role === 'ADMIN') return 'Admin';
  if (role === 'DOCTOR') return 'Doctor';
  return 'Therapist';
}

export function EditUserDialog({ user, open, onOpenChange, onSaved }: EditUserDialogProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEmail(user.email);
    setPhone(user.phone ?? '');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
  }, [open, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);

    const trimmedPhone = phone.trim();
    if (trimmedPhone && !isValidUaeMobile(trimmedPhone)) {
      setError('Mobile number must be a valid UAE number (05XXXXXXXX)');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await updateUser(user.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: trimmedPhone || undefined,
      });

      if (newPassword) {
        await resetUserPassword(user.id, newPassword);
      }

      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user account');
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {roleLabel(user.role)} Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-user-first-name">First name</Label>
              <Input
                id="edit-user-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-last-name">Last name</Label>
              <Input
                id="edit-user-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-user-email">Email</Label>
            <Input
              id="edit-user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-user-phone">Mobile (UAE)</Label>
            <Input
              id="edit-user-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05XXXXXXXX"
            />
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">Change password</p>
            <div className="space-y-2">
              <Label htmlFor="edit-user-password">New password</Label>
              <PasswordInput
                id="edit-user-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-confirm-password">Confirm password</Label>
              <PasswordInput
                id="edit-user-confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave blank to keep the current password. Resetting stores the new password for all
              admins to view.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated Use EditUserDialog */
export const EditAdminDialog = EditUserDialog;
