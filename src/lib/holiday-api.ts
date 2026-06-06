import { apiRequest, apiRequestPaginated } from './api';
import type { PaginatedResponse, PublicHoliday } from './types';

export interface ListPublicHolidaysParams {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreatePublicHolidayPayload {
  name: string;
  startDateTime: string;
  endDateTime: string;
  isFullDay: boolean;
  notes?: string;
}

export type UpdatePublicHolidayPayload = Partial<CreatePublicHolidayPayload>;

function buildQuery(params: ListPublicHolidaysParams): string {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params.dateTo) qs.set('dateTo', params.dateTo);
  return qs.toString();
}

export async function listPublicHolidays(
  params: ListPublicHolidaysParams = {},
): Promise<PaginatedResponse<PublicHoliday>> {
  const query = buildQuery({ page: 1, limit: 100, ...params });
  return apiRequestPaginated<PublicHoliday>(`/public-holidays?${query}`);
}

export async function createPublicHoliday(
  payload: CreatePublicHolidayPayload,
): Promise<{ holiday: PublicHoliday }> {
  return apiRequest<{ holiday: PublicHoliday }>('/public-holidays', {
    method: 'POST',
    body: payload,
  });
}

export async function updatePublicHoliday(
  id: string,
  payload: UpdatePublicHolidayPayload,
): Promise<{ holiday: PublicHoliday }> {
  return apiRequest<{ holiday: PublicHoliday }>(`/public-holidays/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deletePublicHoliday(id: string): Promise<void> {
  await apiRequest<{ success: boolean }>(`/public-holidays/${id}`, { method: 'DELETE' });
}
