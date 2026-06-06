/**
 * Client-side RBAC feature flags. Mirrors backend/src/config/permissions.ts.
 * ADMIN has all features enabled; extend ROLE_FEATURES when new roles are added.
 */
import type { UserRole } from '@/lib/types';

export const AppFeature = {
  MANAGE_BOOKINGS: 'manage_bookings',
  MANAGE_PATIENTS: 'manage_patients',
  MANAGE_THERAPISTS: 'manage_therapists',
  MANAGE_DOCTORS: 'manage_doctors',
  MANAGE_ROOMS: 'manage_rooms',
  MANAGE_THERAPIES: 'manage_therapies',
  MANAGE_INSURANCE: 'manage_insurance',
  MANAGE_LEAVES: 'manage_leaves',
  MANAGE_USERS: 'manage_users',
  VIEW_REPORTS: 'view_reports',
  MANAGE_SETTINGS: 'manage_settings',
  COMPLETE_APPOINTMENTS: 'complete_appointments',
} as const;

export type AppFeatureKey = (typeof AppFeature)[keyof typeof AppFeature];

const ALL_FEATURES: AppFeatureKey[] = Object.values(AppFeature);

const ROLE_FEATURES: Record<UserRole, AppFeatureKey[]> = {
  ADMIN: ALL_FEATURES,
  THERAPIST: [
    AppFeature.MANAGE_BOOKINGS,
    AppFeature.MANAGE_PATIENTS,
    AppFeature.COMPLETE_APPOINTMENTS,
  ],
  DOCTOR: [
    AppFeature.MANAGE_BOOKINGS,
    AppFeature.MANAGE_PATIENTS,
    AppFeature.COMPLETE_APPOINTMENTS,
  ],
};

export function getFeaturesForRole(role: UserRole): AppFeatureKey[] {
  return ROLE_FEATURES[role] ?? [];
}

export function hasFeature(role: UserRole | undefined, feature: AppFeatureKey): boolean {
  if (!role) return false;
  return getFeaturesForRole(role).includes(feature);
}

export function isAdmin(role: UserRole | undefined): boolean {
  return role === 'ADMIN';
}
