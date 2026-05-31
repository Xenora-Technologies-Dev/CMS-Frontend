'use client';

import { TherapistGuard } from '@/components/auth/therapist-guard';
import { TherapistHeader } from '@/components/layout/therapist-header';
import { TherapistSidebar } from '@/components/layout/therapist-sidebar';

export function TherapistShell({ children }: { children: React.ReactNode }) {
  return (
    <TherapistGuard>
      <div className="flex min-h-screen bg-slate-50/80">
        <TherapistSidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <TherapistHeader />
          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </TherapistGuard>
  );
}
