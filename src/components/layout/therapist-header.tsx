'use client';

import { NotificationBell } from '@/components/notifications/notification-bell';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function TherapistHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-white px-4 sm:px-6">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">
          Welcome, {user?.firstName} {user?.lastName}
        </p>
        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <NotificationBell notificationsHref="/therapist" />
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
