import { apiRequest } from './api';

export interface ClinicSettings {
  autoDownloadSlips: boolean;
  allowBookingOutsideConsultationHours: boolean;
}

export interface Clinic {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  emirate?: string | null;
  country?: string;
  phone?: string | null;
  email?: string | null;
  timezone?: string;
  settings?: ClinicSettings;
}

export interface UpdateClinicPayload {
  name?: string;
  address?: string | null;
  city?: string | null;
  emirate?: string | null;
  country?: string;
  phone?: string | null;
  email?: string | null;
  timezone?: string;
  settings?: Partial<ClinicSettings>;
}

export function isAutoDownloadSlipsEnabled(clinic: Clinic | null | undefined): boolean {
  return clinic?.settings?.autoDownloadSlips !== false;
}

export function isAllowBookingOutsideConsultationHoursEnabled(
  clinic: Clinic | null | undefined,
): boolean {
  return clinic?.settings?.allowBookingOutsideConsultationHours === true;
}

export async function getCurrentClinic(): Promise<{ clinic: Clinic }> {
  return apiRequest<{ clinic: Clinic }>('/clinics/current');
}

export async function updateCurrentClinic(
  payload: UpdateClinicPayload,
): Promise<{ clinic: Clinic }> {
  return apiRequest<{ clinic: Clinic }>('/clinics/current', {
    method: 'PATCH',
    body: payload,
  });
}

export function formatClinicLocation(clinic: Pick<Clinic, 'address' | 'city' | 'emirate'>): string | null {
  const parts = [clinic.address, clinic.city, clinic.emirate].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export function getClinicDisplayName(clinic: Clinic | null | undefined): string {
  return clinic?.name?.trim() || 'CliniqFlow';
}
