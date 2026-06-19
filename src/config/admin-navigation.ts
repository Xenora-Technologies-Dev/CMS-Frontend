import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  DoorOpen,
  FileBarChart,
  HeartPulse,
  History,
  LayoutDashboard,
  Palmtree,
  Shield,
  Stethoscope,
  User,
  UserRound,
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
      { title: 'Therapy Booking', href: '/admin/appointments/calendar' },
      { title: 'Consultation Booking', href: '/admin/appointments/consultation' },
      { title: 'Appointment List', href: '/admin/appointments/list' },
      { title: 'Pending Confirmation', href: '/admin/appointments/pending-confirmation' },
      { title: 'Recent Bookings', href: '/admin/appointments/recent' },
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
    title: 'Doctors',
    icon: UserRound,
    items: [
      { title: 'Doctor List', href: '/admin/doctors' },
      { title: 'Add Doctor', href: '/admin/doctors/new' },
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
    type: 'group',
    title: 'Leaves',
    icon: Palmtree,
    items: [
      { title: 'Leave Management', href: '/admin/leaves/management' },
      { title: 'Leave History', href: '/admin/leaves/history' },
      { title: 'Public Holidays', href: '/admin/leaves/holidays' },
    ],
  },
  {
    type: 'group',
    title: 'Reports',
    icon: FileBarChart,
    items: [
      { title: 'Therapy Report', href: '/admin/reports/therapy' },
      { title: 'Consultation Report', href: '/admin/reports/consultation' },
    ],
  },
  {
    type: 'link',
    title: 'User Guide',
    href: '/admin/user-guide',
    icon: BookOpen,
  },
  {
    type: 'link',
    title: 'Users',
    href: '/admin/users',
    icon: UsersRound,
  },
  {
    type: 'link',
    title: 'Activity Log',
    href: '/admin/activity-log',
    icon: History,
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
    title: 'Therapy Booking',
    description: 'Schedule and manage therapy appointments across therapy rooms.',
  },
  '/admin/appointments/consultation': {
    title: 'Consultation Booking',
    description: 'Schedule and manage doctor consultations across consultation rooms.',
  },
  '/admin/appointments/list': {
    title: 'Appointment List',
    description: 'View, filter, and manage all clinic appointments.',
  },
  '/admin/appointments/recent': {
    title: 'Recent Bookings',
    description: 'Bookings created in the last 48 hours with audit tracking.',
  },
  '/admin/appointments/pending-confirmation': {
    title: 'Pending Confirmation',
    description: 'Therapy and consultation bookings awaiting completion confirmation.',
  },
  '/admin/reports/therapy': {
    title: 'Therapy Report',
    description: 'Therapy booking statistics and export.',
  },
  '/admin/reports/consultation': {
    title: 'Consultation Report',
    description: 'Consultation booking log and export.',
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
  '/admin/leaves/management': {
    title: 'Leave Management',
    description: 'Approve requests, enter leave, and resolve booking conflicts.',
  },
  '/admin/leaves/history': {
    title: 'Leave History',
    description: 'Upcoming, today’s, and past therapist leave records.',
  },
  '/admin/leaves/holidays': {
    title: 'Public Holidays',
    description: 'Manage clinic-wide public holidays shown on calendars.',
  },
  '/admin/doctors': {
    title: 'Doctor List',
    description: 'Manage doctors and consultation schedules.',
  },
  '/admin/doctors/new': { title: 'Add Doctor', description: 'Onboard a new doctor to the clinic.' },
  '/admin/users': { title: 'Users', description: 'Clinic staff accounts and roles.' },
  '/admin/activity-log': {
    title: 'Activity Log',
    description: 'Audit trail of clinic actions and changes.',
  },
  '/admin/user-guide': {
    title: 'User Guide',
    description: 'Interactive guide for clinic administrators.',
  },
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
  if (pathname.startsWith('/admin/doctors/') && pathname.endsWith('/edit')) {
    return { title: 'Edit Doctor', description: 'Update doctor profile and hours.' };
  }
  if (pathname.startsWith('/admin/doctors/') && pathname !== '/admin/doctors/new') {
    return { title: 'Doctor Profile', description: 'Contact, hours, and schedule.' };
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
