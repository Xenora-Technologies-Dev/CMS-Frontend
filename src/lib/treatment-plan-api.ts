import { apiRequest, apiRequestPaginated } from './api';
import type { PaginatedResponse, TreatmentPlan } from './types';

export interface ListTreatmentPlansParams {
  page?: number;
  limit?: number;
  patientId?: string;
  therapyId?: string;
  status?: TreatmentPlan['status'];
}

function buildQuery(params: ListTreatmentPlansParams): string {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.patientId) qs.set('patientId', params.patientId);
  if (params.therapyId) qs.set('therapyId', params.therapyId);
  if (params.status) qs.set('status', params.status);
  return qs.toString();
}

export async function listTreatmentPlans(
  params: ListTreatmentPlansParams = {},
): Promise<PaginatedResponse<TreatmentPlan>> {
  const query = buildQuery({ page: 1, limit: 20, ...params });
  return apiRequestPaginated<TreatmentPlan>(`/treatment-plans?${query}`);
}

export async function getActiveTreatmentPlan(
  patientId: string,
  therapyId: string,
): Promise<{ treatmentPlan: TreatmentPlan | null }> {
  const qs = new URLSearchParams({ patientId, therapyId });
  return apiRequest<{ treatmentPlan: TreatmentPlan | null }>(
    `/treatment-plans/active?${qs.toString()}`,
  );
}

export async function getTreatmentPlan(id: string): Promise<{ treatmentPlan: TreatmentPlan }> {
  return apiRequest<{ treatmentPlan: TreatmentPlan }>(`/treatment-plans/${id}`);
}
