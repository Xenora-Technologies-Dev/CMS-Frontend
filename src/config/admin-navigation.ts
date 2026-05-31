import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Building2,
  CalendarDays,
  DoorOpen,
  HeartPulse,
  LayoutDashboard,
  Palmtree,
  Shield,
  Stethoscope,
  User,
  Users,
  UsersRound,
} from 'lucide-react';

export interface AdminNavLink {
  type: 'link';
  title: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

export interface AdminNavGroup {
  type: 'group';
  title: string;
  icon: LucideIcon;
  items: { title: string; href: string; exact?: boolean }[];
}

export type AdminNavItem = AdminNavLink | AdminNavGroup;

export const ADMIN_NAV_MAIN: AdminNavItem[] = [
  {
    type: 'link',
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    type: 'group',
    title: 'Appointments',
    icon: CalendarDays,
    items: [
      { title: 'Booking Calendar', href: '/admin/appointments/calendar' },
      { title: 'Appointment List', href: '/admin/appointments/list' },
      { title: "Today's Appointments", href: '/admin/appointments/today' },
    ],
  },
  {
    type: 'group',
    title: 'Patients',
    icon: Users,
    items: [
      { title: 'Patient List', href: '/admin/patients' },
      { title: 'Add Patient', href: '/admin/patients/new' },
    ],
  },
  {
    type: 'group',
    title: 'Therapists',
    icon: Stethoscope,
    items: [
      { title: 'Therapist List', href: '/admin/therapists' },
      { title: 'Add Therapist', href: '/admin/therapists/new' },
    ],
  },
  {
    type: 'group',
    title: 'Therapies',
    icon: HeartPulse,
    items: [
      { title: 'Therapy List', href: '/admin/therapies' },
      { title: 'Add Therapy', href: '/admin/therapies/new' },
    ],
  },
  {
    type: 'link',
    title: 'Rooms',
    href: '/admin/rooms',
    icon: DoorOpen,
  },
  {
    type: 'link',
    title: 'Insurance',
    href: '/admin/insurance',
    icon: Shield,
  },
  {
    type: 'link',
    title: 'Leaves',
    href: '/admin/leaves',
    icon: Palmtree,
  },
  {
    type: 'link',
    title: 'Users',
    href: '/admin/users',
    icon: UsersRound,
  },
];

export const ADMIN_NAV_SECONDARY: AdminNavItem[] = [
  {
    type: 'link',
    title: 'Clinic Settings',
    href: '/admin/settings',
    icon: Building2,
  },
  {
    type: 'link',
    title: 'Notifications',
    href: '/admin/notifications',
    icon: Bell,
  },
  {
    type: 'link',
    title: 'Profile',
    href: '/admin/profile',
    icon: User,
  },
];

export const ADMIN_NAV_ALL: AdminNavItem[] = [...ADMIN_NAV_MAIN, ...ADMIN_NAV_SECONDARY];

export interface AdminPageMeta {
  title: string;
  description?: string;
}

const PAGE_META: Record<string, AdminPageMeta> = {
  '/admin': { title: 'Dashboard', description: 'Overview of clinic operations and key metrics.' },
  '/admin/appointments/calendar': {
    title: 'Booking Calendar',
    description: 'Schedule and manage therapy appointments across rooms.',
  },
  '/admin/appointments/list': {
    title: 'Appointment List',
    description: 'View, filter, and manage all clinic appointments.',
  },
  '/admin/appointments/today': {
    title: "Today's Appointments",
    description: 'View and manage all appointments scheduled for today.',
  },
  '/admin/patients': { title: 'Patient List', description: 'Search and manage registered patients.' },
  '/admin/patients/new': { title: 'Add Patient', description: 'Register a new patient in the clinic.' },
  '/admin/therapists': {
    title: 'Therapist List',
    description: 'Manage therapists, schedules, and assignments.',
  },
  '/admin/therapists/new': { title: 'Add Therapist', description: 'Onboard a new therapist to the clinic.' },
  '/admin/therapies': { title: 'Therapy List', description: 'Configure therapy types and durations.' },
  '/admin/therapies/new': { title: 'Add Therapy', description: 'Create a new therapy offering.' },
  '/admin/rooms': { title: 'Rooms', description: 'Manage treatment rooms and availability.' },
  '/admin/insurance': { title: 'Insurance', description: 'Insurance providers and patient coverage.' },
  '/admin/leaves': { title: 'Leaves', description: 'Therapist leave requests and approvals.' },
  '/admin/users': { title: 'Users', description: 'Clinic staff accounts and roles.' },
  '/admin/notifications': { title: 'Notifications', description: 'System alerts and activity updates.' },
  '/admin/settings': {
    title: 'Clinic Settings',
    description: 'Optional clinic name, location, and contact details.',
  },
  '/admin/profile': { title: 'Profile', description: 'Your account settings and preferences.' },
};

export function isPathActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isNavGroupActive(pathname: string, group: AdminNavGroup): boolean {
  return group.items.some((item) => isPathActive(pathname, item.href, item.exact));
}

export function isNavLinkActive(pathname: string, link: AdminNavLink): boolean {
  return isPathActive(pathname, link.href, link.exact);
}

export function getAdminPageMeta(pathname: string): AdminPageMeta {
  if (PAGE_META[pathname]) return PAGE_META[pathname];

  if (pathname.includes('/patients/') && pathname.endsWith('/edit')) {
    return { title: 'Edit Patient', description: 'Update patient details and insurance.' };
  }
  if (pathname.startsWith('/admin/patients/') && pathname !== '/admin/patients/new') {
    return { title: 'Patient Profile', description: 'Personal info, insurance, and appointments.' };
  }
  if (pathname.startsWith('/admin/therapists/') && pathname.endsWith('/edit')) {
    return { title: 'Edit Therapist', description: 'Update therapist profile and hours.' };
  }
  if (pathname.startsWith('/admin/therapists/') && pathname !== '/admin/therapists/new') {
    return { title: 'Therapist Profile', description: 'Contact, hours, and availability.' };
  }
  if (pathname.includes('/therapies/') && pathname.endsWith('/edit')) {
    return { title: 'Edit Therapy', description: 'Update therapy configuration.' };
  }
  if (pathname.includes('/rooms/') && pathname.endsWith('/edit')) {
    return { title: 'Edit Room', description: 'Update room details.' };
  }
  if (pathname === '/admin/rooms/new') {
    return { title: 'Add Room', description: 'Add a new treatment room.' };
  }

  return { title: 'Clinic Admin', description: 'Clinic management portal' };
}
