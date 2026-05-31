import { apiRequest, apiRequestPaginated } from './api';
import type {
  CreateAdminPayload,
  PaginatedResponse,
  UserListItem,
} from './types';

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'ADMIN' | 'THERAPIST';
  isActive?: boolean;
}

function buildQuery(params: ListUsersParams): string {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search?.trim()) qs.set('search', params.search.trim());
  if (params.role) qs.set('role', params.role);
  if (params.isActive !== undefined) qs.set('isActive', String(params.isActive));
  return qs.toString();
}

export async function listUsers(
  params: ListUsersParams = {},
): Promise<PaginatedResponse<UserListItem>> {
  const query = buildQuery({ page: 1, limit: 20, ...params });
  return apiRequestPaginated<UserListItem>(`/users?${query}`);
}

export interface UpdateAdminPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export async function getUser(userId: string): Promise<{ user: UserListItem }> {
  return apiRequest<{ user: UserListItem }>(`/users/${userId}`);
}

export async function updateAdmin(
  userId: string,
  payload: UpdateAdminPayload,
): Promise<{ user: UserListItem }> {
  return apiRequest<{ user: UserListItem }>(`/users/${userId}`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function createAdmin(
  payload: CreateAdminPayload,
): Promise<{ user: UserListItem }> {
  return apiRequest<{ user: UserListItem }>('/users/admins', {
    method: 'POST',
    body: payload,
  });
}

export async function setUserStatus(
  userId: string,
  isActive: boolean,
): Promise<{ user: UserListItem }> {
  return apiRequest<{ user: UserListItem }>(`/users/${userId}/status`, {
    method: 'PATCH',
    body: { isActive },
  });
}

export async function resetUserPassword(
  userId: string,
  password: string,
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/users/${userId}/reset-password`, {
    method: 'POST',
    body: { password },
  });
}
