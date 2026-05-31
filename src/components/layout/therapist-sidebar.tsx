'use client';

import { TherapistSidebarNav } from '@/components/layout/therapist-sidebar-nav';
import { useAuth } from '@/components/auth/auth-provider';
import { Stethoscope } from 'lucide-react';
import Link from 'next/link';

export function TherapistSidebar() {
  const { user } = useAuth();

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-4">
        <Link href="/therapist" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">CliniqFlow</p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.firstName} {user?.lastName}
            </p>
          </div>
        </Link>
      </div>
      <div className="min-h-0 flex-1">
        <TherapistSidebarNav />
      </div>
    </aside>
  );
}
