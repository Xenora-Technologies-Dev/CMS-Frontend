import { apiRequest, apiRequestPaginated } from './api';
import type { PaginatedResponse } from './types';

export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveRequest {
  id: string;
  clinicId: string;
  therapistId: string;
  startDate: string;
  endDate: string;
  status: LeaveRequestStatus;
  reason: string;
  adminNotes?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  therapist: {
    id: string;
    user: { id: string; firstName: string; lastName: string; email: string };
  };
  approvedBy?: { id: string; firstName: string; lastName: string } | null;
}

export interface ListLeaveParams {
  page?: number;
  limit?: number;
  status?: LeaveRequestStatus;
  therapistId?: string;
}

export interface CreateLeavePayload {
  therapistId?: string;
  startDate: string;
  endDate: string;
  reason: string;
}

function buildQuery(params: ListLeaveParams): string {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.status) qs.set('status', params.status);
  if (params.therapistId) qs.set('therapistId', params.therapistId);
  return qs.toString();
}

export async function listLeaveRequests(
  params: ListLeaveParams = {},
): Promise<PaginatedResponse<LeaveRequest>> {
  const query = buildQuery({ page: 1, limit: 20, ...params });
  return apiRequestPaginated<LeaveRequest>(`/leave-requests?${query}`);
}

export async function createLeaveRequest(
  payload: CreateLeavePayload,
): Promise<{ leaveRequest: LeaveRequest }> {
  return apiRequest<{ leaveRequest: LeaveRequest }>('/leave-requests', {
    method: 'POST',
    body: payload,
  });
}

export async function approveLeaveRequest(
  id: string,
  adminNotes?: string,
): Promise<{ leaveRequest: LeaveRequest }> {
  return apiRequest<{ leaveRequest: LeaveRequest }>(`/leave-requests/${id}/approve`, {
    method: 'POST',
    body: { adminNotes },
  });
}

export async function rejectLeaveRequest(
  id: string,
  adminNotes: string,
): Promise<{ leaveRequest: LeaveRequest }> {
  return apiRequest<{ leaveRequest: LeaveRequest }>(`/leave-requests/${id}/reject`, {
    method: 'POST',
    body: { adminNotes },
  });
}

export async function cancelLeaveRequest(
  id: string,
): Promise<{ leaveRequest: LeaveRequest }> {
  return apiRequest<{ leaveRequest: LeaveRequest }>(`/leave-requests/${id}/cancel`, {
    method: 'POST',
  });
}
