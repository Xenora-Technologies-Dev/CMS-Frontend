import { apiRequest, apiRequestPaginated } from './api';
import type { PaginatedResponse, TherapyDetail } from './types';

export interface ListTherapiesParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface CreateTherapyPayload {
  name: string;
  code?: string;
  description?: string;
  durationMinutes: number;
  price?: number;
  currency?: string;
  isPackageBased?: boolean;
  packageSessions?: number;
  packageValidityDays?: number;
  packageDescription?: string;
}

export type UpdateTherapyPayload = Partial<CreateTherapyPayload> & { isActive?: boolean };

function buildQuery(params: ListTherapiesParams): string {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search?.trim()) qs.set('search', params.search.trim());
  if (params.isActive !== undefined) qs.set('isActive', String(params.isActive));
  return qs.toString();
}

export async function listTherapies(
  params: ListTherapiesParams = {},
): Promise<PaginatedResponse<TherapyDetail>> {
  const query = buildQuery({ page: 1, limit: 20, ...params });
  return apiRequestPaginated<TherapyDetail>(`/therapies?${query}`);
}

export async function getTherapy(id: string): Promise<{ therapy: TherapyDetail }> {
  return apiRequest<{ therapy: TherapyDetail }>(`/therapies/${id}`);
}

export async function createTherapy(
  payload: CreateTherapyPayload,
): Promise<{ therapy: TherapyDetail }> {
  return apiRequest<{ therapy: TherapyDetail }>('/therapies', { method: 'POST', body: payload });
}

export async function updateTherapy(
  id: string,
  payload: UpdateTherapyPayload,
): Promise<{ therapy: TherapyDetail }> {
  return apiRequest<{ therapy: TherapyDetail }>(`/therapies/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deleteTherapy(id: string): Promise<void> {
  await apiRequest<{ success: boolean }>(`/therapies/${id}`, { method: 'DELETE' });
}
