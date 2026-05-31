import type { LucideIcon } from 'lucide-react';
import { Bell, CalendarDays, LayoutDashboard, Palmtree, User } from 'lucide-react';

export interface TherapistNavLink {
  type: 'link';
  title: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

export interface TherapistNavGroup {
  type: 'group';
  title: string;
  icon: LucideIcon;
  items: { title: string; href: string; exact?: boolean }[];
}

export type TherapistNavItem = TherapistNavLink | TherapistNavGroup;

export const THERAPIST_NAV_MAIN: TherapistNavItem[] = [
  {
    type: 'link',
    title: 'Dashboard',
    href: '/therapist',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    type: 'group',
    title: 'Appointments',
    icon: CalendarDays,
    items: [{ title: 'My Calendar', href: '/therapist/calendar' }],
  },
  {
    type: 'link',
    title: 'Leave',
    href: '/therapist/leaves',
    icon: Palmtree,
  },
];

export const THERAPIST_NAV_SECONDARY: TherapistNavItem[] = [
  {
    type: 'link',
    title: 'Notifications',
    href: '/therapist/notifications',
    icon: Bell,
  },
  {
    type: 'link',
    title: 'Profile',
    href: '/therapist/profile',
    icon: User,
  },
];

export const THERAPIST_NAV_ALL: TherapistNavItem[] = [
  ...THERAPIST_NAV_MAIN,
  ...THERAPIST_NAV_SECONDARY,
];

/** @deprecated Use THERAPIST_NAV_MAIN flat links for simple lists */
export const THERAPIST_NAV = THERAPIST_NAV_ALL.filter(
  (item): item is TherapistNavLink => item.type === 'link',
);

export interface TherapistPageMeta {
  title: string;
  description?: string;
}

const PAGE_META: Record<string, TherapistPageMeta> = {
  '/therapist': {
    title: 'Dashboard',
    description: 'Your schedule, notifications, and leave status.',
  },
  '/therapist/calendar': {
    title: 'My Calendar',
    description: 'View your scheduled appointments.',
  },
  '/therapist/leaves': {
    title: 'Leave Requests',
    description: 'Request and track your leave.',
  },
  '/therapist/notifications': {
    title: 'Notifications',
    description: 'Appointment and clinic alerts.',
  },
  '/therapist/profile': {
    title: 'Profile',
    description: 'Your account settings.',
  },
};

export function isPathActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  if (href === '/therapist') return pathname === '/therapist';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isTherapistNavGroupActive(pathname: string, group: TherapistNavGroup): boolean {
  return group.items.some((item) => isPathActive(pathname, item.href, item.exact));
}

export function isTherapistNavLinkActive(pathname: string, link: TherapistNavLink): boolean {
  return isPathActive(pathname, link.href, link.exact);
}

export function isTherapistNavActive(pathname: string, href: string, exact?: boolean): boolean {
  return isPathActive(pathname, href, exact);
}

export function getTherapistPageMeta(pathname: string): TherapistPageMeta {
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  return { title: 'Therapist Portal', description: 'Your clinic workspace' };
}
