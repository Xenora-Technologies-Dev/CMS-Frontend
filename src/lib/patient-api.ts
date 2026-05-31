import { apiRequest, apiRequestPaginated } from './api';
import type { PaginatedResponse, PatientListItem, PatientProfile } from './types';

export interface ListPatientsParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface CreatePatientPayload {
  firstName: string;
  lastName: string;
  medicalRecordNo?: string;
  dateOfBirth?: string;
  gender?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  nationality?: string;
  emiratesId?: string;
  address?: string;
  city?: string;
  emirate?: string;
  notes?: string;
}

export type UpdatePatientPayload = Partial<CreatePatientPayload> & { isActive?: boolean };

function buildQuery(params: ListPatientsParams): string {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search?.trim()) qs.set('search', params.search.trim());
  if (params.isActive !== undefined) qs.set('isActive', String(params.isActive));
  return qs.toString();
}

export async function listPatients(
  params: ListPatientsParams = {},
): Promise<PaginatedResponse<PatientListItem>> {
  const query = buildQuery({ page: 1, limit: 20, ...params });
  return apiRequestPaginated<PatientListItem>(`/patients?${query}`);
}

export async function getPatient(id: string): Promise<{ patient: PatientProfile }> {
  return apiRequest<{ patient: PatientProfile }>(`/patients/${id}`);
}

export async function createPatient(
  payload: CreatePatientPayload,
): Promise<{ patient: PatientProfile }> {
  return apiRequest<{ patient: PatientProfile }>('/patients', { method: 'POST', body: payload });
}

export async function updatePatient(
  id: string,
  payload: UpdatePatientPayload,
): Promise<{ patient: PatientProfile }> {
  return apiRequest<{ patient: PatientProfile }>(`/patients/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}
