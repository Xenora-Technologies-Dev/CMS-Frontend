import { apiRequest, apiRequestPaginated } from './api';
import type { PaginatedResponse, RoomDetail } from './types';

import type { RoomType } from './types';

export interface ListRoomsParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  roomType?: RoomType;
}

export interface CreateRoomPayload {
  name: string;
  code?: string;
  roomType?: RoomType;
  capacity?: number;
  floor?: string;
  equipment?: string;
  notes?: string;
}

export type UpdateRoomPayload = Partial<CreateRoomPayload> & { isActive?: boolean };

function buildQuery(params: ListRoomsParams): string {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search?.trim()) qs.set('search', params.search.trim());
  if (params.isActive !== undefined) qs.set('isActive', String(params.isActive));
  if (params.roomType) qs.set('roomType', params.roomType);
  return qs.toString();
}

export async function listRooms(
  params: ListRoomsParams = {},
): Promise<PaginatedResponse<RoomDetail>> {
  const query = buildQuery({ page: 1, limit: 20, ...params });
  return apiRequestPaginated<RoomDetail>(`/rooms?${query}`);
}

export async function getRoom(id: string): Promise<{ room: RoomDetail }> {
  return apiRequest<{ room: RoomDetail }>(`/rooms/${id}`);
}

export async function createRoom(payload: CreateRoomPayload): Promise<{ room: RoomDetail }> {
  return apiRequest<{ room: RoomDetail }>('/rooms', { method: 'POST', body: payload });
}

export async function updateRoom(
  id: string,
  payload: UpdateRoomPayload,
): Promise<{ room: RoomDetail }> {
  return apiRequest<{ room: RoomDetail }>(`/rooms/${id}`, { method: 'PATCH', body: payload });
}

export async function deleteRoom(id: string): Promise<void> {
  await apiRequest<{ success: boolean }>(`/rooms/${id}`, { method: 'DELETE' });
}
