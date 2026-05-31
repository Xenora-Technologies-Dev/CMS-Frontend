'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { THERAPIST_NAV, isTherapistNavActive } from '@/config/therapist-navigation';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Stethoscope } from 'lucide-react';

export function TherapistSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-white lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Stethoscope className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">CliniqFlow</p>
          <p className="text-xs text-muted-foreground truncate max-w-[140px]">
            {user?.firstName} {user?.lastName}
          </p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {THERAPIST_NAV.map((item) => {
          const active = isTherapistNavActive(pathname, item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
