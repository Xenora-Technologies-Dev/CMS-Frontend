import type { LucideIcon } from 'lucide-react';
import { CalendarDays, LayoutDashboard, User } from 'lucide-react';

export interface DoctorNavLink {
  type: 'link';
  title: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

export interface DoctorNavGroup {
  type: 'group';
  title: string;
  icon: LucideIcon;
  items: { title: string; href: string; exact?: boolean }[];
}

export type DoctorNavItem = DoctorNavLink | DoctorNavGroup;

export const DOCTOR_NAV_MAIN: DoctorNavItem[] = [
  {
    type: 'link',
    title: 'Dashboard',
    href: '/doctor',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    type: 'group',
    title: 'Appointments',
    icon: CalendarDays,
    items: [{ title: 'My Calendar', href: '/doctor/calendar' }],
  },
];

export const DOCTOR_NAV_SECONDARY: DoctorNavItem[] = [
  {
    type: 'link',
    title: 'Profile',
    href: '/doctor/profile',
    icon: User,
  },
];

export const DOCTOR_NAV_ALL: DoctorNavItem[] = [...DOCTOR_NAV_MAIN, ...DOCTOR_NAV_SECONDARY];

export interface DoctorPageMeta {
  title: string;
  description?: string;
}

const PAGE_META: Record<string, DoctorPageMeta> = {
  '/doctor': {
    title: 'Dashboard',
    description: 'Your consultation schedule overview.',
  },
  '/doctor/calendar': {
    title: 'My Calendar',
    description: 'View your scheduled consultations.',
  },
  '/doctor/profile': {
    title: 'Profile',
    description: 'Your account settings.',
  },
};

export function isPathActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  if (href === '/doctor') return pathname === '/doctor';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isDoctorNavGroupActive(pathname: string, group: DoctorNavGroup): boolean {
  return group.items.some((item) => isPathActive(pathname, item.href, item.exact));
}

export function isDoctorNavLinkActive(pathname: string, link: DoctorNavLink): boolean {
  return isPathActive(pathname, link.href, link.exact);
}

export function getDoctorPageMeta(pathname: string): DoctorPageMeta {
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  return { title: 'Doctor Portal', description: 'Your clinic workspace' };
}
