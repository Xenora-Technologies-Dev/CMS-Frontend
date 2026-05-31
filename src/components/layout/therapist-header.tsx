'use client';

import { TherapistMobileNav } from '@/components/layout/therapist-mobile-nav';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useAuth } from '@/components/auth/auth-provider';
import { getTherapistPageMeta } from '@/config/therapist-navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getUserInitials } from '@/lib/navigation';
import { Bell, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function TherapistHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const meta = getTherapistPageMeta(pathname);

  const initials = user ? getUserInitials(user.firstName, user.lastName) : 'TH';
  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Therapist';

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
      <TherapistMobileNav />

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">{meta.title}</h1>
        {meta.description && (
          <p className="hidden truncate text-sm text-muted-foreground sm:block">{meta.description}</p>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <NotificationBell notificationsHref="/therapist/notifications" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 gap-2 rounded-full pl-1 pr-2 sm:pl-1 sm:pr-3"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[140px] truncate text-sm font-medium sm:inline">
                {displayName}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                {user?.email && (
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/therapist/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/therapist/notifications" className="cursor-pointer">
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
