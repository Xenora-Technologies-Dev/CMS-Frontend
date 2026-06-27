'use client';

import { ActiveStatusBadge } from '@/components/shared/active-status-badge';
import { PasswordInput } from '@/components/shared/password-input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getUser } from '@/lib/user-api';
import type { UserListItem, UserRole } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { Loader2, Shield, UserCog } from 'lucide-react';
import { useEffect, useState } from 'react';

interface UserViewDialogProps {
  user: UserListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function RoleBadge({ role }: { role: UserRole }) {
  if (role === 'ADMIN') {
    return (
      <Badge variant="default" className="gap-1">
        <Shield className="h-3 w-3" />
        Admin
      </Badge>
    );
  }
  if (role === 'DOCTOR') {
    return (
      <Badge variant="secondary" className="gap-1 bg-violet-100 text-violet-800">
        <UserCog className="h-3 w-3" />
        Doctor
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <UserCog className="h-3 w-3" />
      Therapist
    </Badge>
  );
}

export function UserViewDialog({ user, open, onOpenChange }: UserViewDialogProps) {
  const [managedPassword, setManagedPassword] = useState<string | null | undefined>(undefined);
  const [loadingPassword, setLoadingPassword] = useState(false);

  useEffect(() => {
    if (!open || !user) {
      setManagedPassword(undefined);
      return;
    }

    let cancelled = false;
    async function loadPassword() {
      setLoadingPassword(true);
      try {
        const { user: detail } = await getUser(user!.id);
        if (!cancelled) setManagedPassword(detail.managedPassword ?? null);
      } catch {
        if (!cancelled) setManagedPassword(null);
      } finally {
        if (!cancelled) setLoadingPassword(false);
      }
    }
    void loadPassword();
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {user.firstName} {user.lastName}
          </DialogTitle>
        </DialogHeader>
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Role</dt>
            <dd>
              <RoleBadge role={user.role} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <ActiveStatusBadge isActive={user.isActive} />
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="shrink-0 text-muted-foreground">Email</dt>
            <dd className="text-right font-medium">{user.email}</dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="shrink-0 text-muted-foreground">Mobile</dt>
            <dd className="text-right font-medium">{user.phone ?? '—'}</dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="shrink-0 text-muted-foreground">Last login</dt>
            <dd className="text-right font-medium">
              {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Never'}
            </dd>
          </div>
        </dl>

        <div className="mt-4 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">Login password (admin only)</p>
          {loadingPassword ? (
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : managedPassword ? (
            <>
              <p className="text-xs text-amber-800">
                Last password set at create or reset. Visible to all clinic admins.
              </p>
              <PasswordInput value={managedPassword} readOnly containerClassName="max-w-full" />
            </>
          ) : (
            <p className="text-xs text-amber-800">
              No password on record. Reset the password from Edit to store it for admin reference.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
