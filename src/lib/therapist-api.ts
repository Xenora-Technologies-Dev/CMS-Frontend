import { apiRequest, apiRequestPaginated } from './api';
import type {
  DayOfWeek,
  PaginatedResponse,
  TherapistAvailability,
  TherapistDetail,
  TherapistListItem,
} from './types';

export interface ListTherapistsParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface CreateTherapistPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  licenseNumber?: string;
  specialization?: string;
  bio?: string;
  colorCode?: string;
  consultationStartTime?: string;
  consultationEndTime?: string;
  requiresConsultationHours?: boolean;
}

export interface UpdateTherapistPayload {
  licenseNumber?: string;
  specialization?: string;
  bio?: string;
  colorCode?: string | null;
  consultationStartTime?: string | null;
  consultationEndTime?: string | null;
  requiresConsultationHours?: boolean;
  isActive?: boolean;
}

export interface CreateAvailabilityPayload {
  dayOfWeek?: DayOfWeek;
  specificDate?: string;
  startTime: string;
  endTime: string;
  isRecurring?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  notes?: string;
}

function buildQuery(params: ListTherapistsParams): string {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search?.trim()) qs.set('search', params.search.trim());
  if (params.isActive !== undefined) qs.set('isActive', String(params.isActive));
  return qs.toString();
}

export async function listTherapists(
  params: ListTherapistsParams = {},
): Promise<PaginatedResponse<TherapistListItem>> {
  const query = buildQuery({ page: 1, limit: 20, ...params });
  return apiRequestPaginated<TherapistListItem>(`/therapists?${query}`);
}

export async function getTherapist(id: string): Promise<{ therapist: TherapistDetail }> {
  return apiRequest<{ therapist: TherapistDetail }>(`/therapists/${id}`);
}

export interface CreatedTherapistUser {
  id: string;
  therapistId?: string;
  email: string;
  firstName: string;
  lastName: string;
}

export async function createTherapist(
  payload: CreateTherapistPayload,
): Promise<{ user: CreatedTherapistUser }> {
  return apiRequest<{ user: CreatedTherapistUser }>('/users/therapists', {
    method: 'POST',
    body: payload,
  });
}

export async function updateTherapist(
  id: string,
  payload: UpdateTherapistPayload,
): Promise<{ therapist: TherapistDetail }> {
  return apiRequest<{ therapist: TherapistDetail }>(`/therapists/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function listTherapistAvailability(
  therapistId: string,
): Promise<TherapistAvailability[]> {
  const result = await apiRequest<{ availability: TherapistAvailability[] }>(
    `/therapists/${therapistId}/availability`,
  );
  return result.availability;
}

export async function createTherapistAvailability(
  therapistId: string,
  payload: CreateAvailabilityPayload,
): Promise<{ availability: TherapistAvailability }> {
  return apiRequest<{ availability: TherapistAvailability }>(
    `/therapists/${therapistId}/availability`,
    { method: 'POST', body: payload },
  );
}

export async function deleteTherapistAvailability(
  therapistId: string,
  availabilityId: string,
): Promise<void> {
  await apiRequest<{ success: boolean }>(
    `/therapists/${therapistId}/availability/${availabilityId}`,
    { method: 'DELETE' },
  );
}
