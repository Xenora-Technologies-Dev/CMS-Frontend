import { apiRequest, apiRequestPaginated } from './api';
import type { PaginatedResponse } from './types';

export type NotificationType =
  | 'BOOKING_CREATED'
  | 'BOOKING_UPDATED'
  | 'BOOKING_CANCELLED'
  | 'LEAVE_REQUESTED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'SYSTEM';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
}

export async function listNotifications(params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<PaginatedResponse<Notification>> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit ?? 10));
  if (params?.unreadOnly) qs.set('unreadOnly', 'true');
  return apiRequestPaginated<Notification>(`/notifications?${qs.toString()}`);
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiRequest<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiRequest<{ success: boolean }>('/notifications/read-all', { method: 'PATCH' });
}
