import { apiRequest, apiRequestPaginated } from './api';
import type { AuthorizationStatus, InsuranceProvider, PaginatedResponse, PatientInsurance } from './types';

export interface ListProvidersParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface CreatePatientInsurancePayload {
  insuranceProviderId: string;
  policyNumber: string;
  memberId?: string;
  groupNumber?: string;
  planName?: string;
  coveragePercent?: number;
  validFrom?: string;
  validTo?: string;
  isPrimary?: boolean;
  notes?: string;
  authorizationNumber?: string;
  authorizationNotes?: string;
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') qs.set(key, String(value));
  }
  return qs.toString();
}

export async function listInsuranceProviders(
  params: ListProvidersParams = {},
): Promise<PaginatedResponse<InsuranceProvider>> {
  const query = buildQuery({ page: 1, limit: 100, isActive: true, ...params });
  return apiRequestPaginated<InsuranceProvider>(`/insurance/providers?${query}`);
}

export async function listPatientInsurances(
  patientId: string,
  params: { page?: number; limit?: number; authorizationStatus?: AuthorizationStatus } = {},
): Promise<PaginatedResponse<PatientInsurance>> {
  const query = buildQuery({ page: 1, limit: 10, ...params });
  return apiRequestPaginated<PatientInsurance>(`/insurance/patients/${patientId}?${query}`);
}

export async function createPatientInsurance(
  patientId: string,
  payload: CreatePatientInsurancePayload,
): Promise<{ insurance: PatientInsurance }> {
  return apiRequest<{ insurance: PatientInsurance }>(`/insurance/patients/${patientId}`, {
    method: 'POST',
    body: payload,
  });
}
