'use client';

import { TherapistSidebarNav } from '@/components/layout/therapist-sidebar-nav';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Stethoscope } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export function TherapistMobileNav() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-[min(100vw-2rem,18rem)] flex-col gap-0 p-0">
        <SheetHeader className="border-b px-4 py-4 text-left">
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <Link href="/therapist" onClick={() => setOpen(false)} className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">CliniqFlow</p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
          </Link>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-hidden">
          <TherapistSidebarNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
