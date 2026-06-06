'use client';

import { DoctorGuard } from '@/components/auth/doctor-guard';
import { DoctorHeader } from '@/components/layout/doctor-header';
import { DoctorSidebar } from '@/components/layout/doctor-sidebar';

export function DoctorShell({ children }: { children: React.ReactNode }) {
  return (
    <DoctorGuard>
      <div className="flex min-h-screen bg-slate-50/80">
        <DoctorSidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <DoctorHeader />
          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </DoctorGuard>
  );
}
