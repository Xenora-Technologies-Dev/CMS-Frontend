import type { AdminNavGroup, AdminNavItem, AdminNavLink } from '@/config/admin-navigation';
import { ADMIN_NAV_ALL } from '@/config/admin-navigation';
import { DOCTOR_NAV_ALL } from '@/config/doctor-navigation';
import { THERAPIST_NAV_ALL } from '@/config/therapist-navigation';
export function getUserInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function findNavGroupForPath(pathname: string): AdminNavGroup | null {
  for (const item of ADMIN_NAV_ALL) {
    if (item.type === 'group' && item.items.some((child) => pathname.startsWith(child.href))) {
      return item;
    }
  }
  return null;
}

export function findNavLinkForPath(pathname: string): AdminNavLink | null {
  for (const item of ADMIN_NAV_ALL) {
    if (item.type === 'link' && pathname.startsWith(item.href) && item.href !== '/admin') {
      return item;
    }
    if (item.type === 'link' && item.href === '/admin' && pathname === '/admin') {
      return item;
    }
  }
  return null;
}

export function getDefaultOpenGroups(pathname: string): string[] {
  const groups: string[] = [];

  for (const item of ADMIN_NAV_ALL) {
    if (item.type === 'group' && item.items.some((child) => pathname.startsWith(child.href))) {
      groups.push(item.title);
    }
  }

  for (const item of THERAPIST_NAV_ALL) {
    if (item.type === 'group' && item.items.some((child) => pathname.startsWith(child.href))) {
      groups.push(item.title);
    }
  }

  for (const item of DOCTOR_NAV_ALL) {
    if (item.type === 'group' && item.items.some((child) => pathname.startsWith(child.href))) {
      groups.push(item.title);
    }
  }

  return groups;
}