import { apiRequest, apiRequestPaginated } from './api';
import type { DoctorDetail, DoctorListItem, PaginatedResponse } from './types';

export interface ListDoctorsParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface CreateDoctorPayload {
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
}

export interface UpdateDoctorPayload {
  licenseNumber?: string;
  specialization?: string;
  bio?: string;
  colorCode?: string | null;
  consultationStartTime?: string | null;
  consultationEndTime?: string | null;
  isActive?: boolean;
}

function buildQuery(params: ListDoctorsParams): string {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search?.trim()) qs.set('search', params.search.trim());
  if (params.isActive !== undefined) qs.set('isActive', String(params.isActive));
  return qs.toString();
}

export async function listDoctors(
  params: ListDoctorsParams = {},
): Promise<PaginatedResponse<DoctorListItem>> {
  const query = buildQuery({ page: 1, limit: 20, ...params });
  return apiRequestPaginated<DoctorListItem>(`/doctors?${query}`);
}

export async function getDoctor(id: string): Promise<{ doctor: DoctorDetail }> {
  return apiRequest<{ doctor: DoctorDetail }>(`/doctors/${id}`);
}

export interface CreatedDoctorUser {
  id: string;
  doctorId?: string;
  email: string;
  firstName: string;
  lastName: string;
}

export async function createDoctor(
  payload: CreateDoctorPayload,
): Promise<{ user: CreatedDoctorUser }> {
  return apiRequest<{ user: CreatedDoctorUser }>('/users/doctors', {
    method: 'POST',
    body: payload,
  });
}

export async function updateDoctor(
  id: string,
  payload: UpdateDoctorPayload,
): Promise<{ doctor: DoctorDetail }> {
  return apiRequest<{ doctor: DoctorDetail }>(`/doctors/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}
