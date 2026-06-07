'use client';

import { AdminSidebarNav } from '@/components/layout/admin-sidebar-nav';
import { AppVersion } from '@/components/shared/app-version';
import { useClinicOptional } from '@/components/providers/clinic-provider';
import { getClinicDisplayName } from '@/lib/clinic-api';
import { Stethoscope } from 'lucide-react';
import Link from 'next/link';

export function AdminSidebar() {
  const clinicContext = useClinicOptional();
  const clinicName = getClinicDisplayName(clinicContext?.clinic);

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-4">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">CliniqFlow</p>
            <p className="truncate text-xs text-muted-foreground">{clinicName}</p>
          </div>
        </Link>
      </div>
      <div className="min-h-0 flex-1">
        <AdminSidebarNav />
      </div>
      <div className="shrink-0 border-t border-sidebar-border px-4 py-3">
        <AppVersion />
      </div>
    </aside>
  );
}
