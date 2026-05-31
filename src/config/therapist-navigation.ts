import type { LucideIcon } from 'lucide-react';
import { CalendarDays, LayoutDashboard, Palmtree, User } from 'lucide-react';

export interface TherapistNavLink {
  title: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const THERAPIST_NAV: TherapistNavLink[] = [
  { title: 'Dashboard', href: '/therapist', icon: LayoutDashboard, exact: true },
  { title: 'My Calendar', href: '/therapist/calendar', icon: CalendarDays },
  { title: 'Leave', href: '/therapist/leaves', icon: Palmtree },
  { title: 'Profile', href: '/therapist/profile', icon: User },
];

export function isTherapistNavActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
