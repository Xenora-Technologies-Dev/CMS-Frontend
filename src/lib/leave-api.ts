import { apiRequest, apiRequestPaginated } from './api';
import type { PaginatedResponse } from './types';

export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveRequest {
  id: string;
  clinicId: string;
  therapistId: string;
  startDateTime: string;
  endDateTime: string;
  isFullDay: boolean;
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

export interface ApprovedLeaveSummary {
  id: string;
  therapistId: string;
  startDateTime: string;
  endDateTime: string;
  isFullDay: boolean;
  reason: string;
}

export interface AffectedBooking {
  id: string;
  startTime: string;
  endTime: string;
  patient: { id: string; firstName: string; lastName: string; phone?: string | null };
  therapy: { id: string; name: string };
  room?: { id: string; name: string };
  therapist?: {
    user: { firstName: string; lastName: string };
  };
}

export interface BookingNeedingAttention extends AffectedBooking {
  attentionReason: string;
  leaveRequestId: string;
  leaveStatus: string;
  leaveReason: string;
}

export type LeaveHistoryScope = 'upcoming' | 'today' | 'past';

export interface ListLeaveParams {
  page?: number;
  limit?: number;
  status?: LeaveRequestStatus;
  therapistId?: string;
  scope?: LeaveHistoryScope;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface CreateLeavePayload {
  therapistId?: string;
  startDateTime: string;
  endDateTime: string;
  isFullDay?: boolean;
  reason: string;
}

export interface UpdateLeavePayload {
  startDateTime: string;
  endDateTime: string;
  isFullDay?: boolean;
  reason: string;
  adminNotes?: string;
}

function buildQuery(params: ListLeaveParams): string {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.status) qs.set('status', params.status);
  if (params.therapistId) qs.set('therapistId', params.therapistId);
  if (params.scope) qs.set('scope', params.scope);
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params.dateTo) qs.set('dateTo', params.dateTo);
  if (params.search) qs.set('search', params.search);
  return qs.toString();
}

export async function listLeaveRequests(
  params: ListLeaveParams = {},
): Promise<PaginatedResponse<LeaveRequest>> {
  const query = buildQuery({ page: 1, limit: 20, ...params });
  return apiRequestPaginated<LeaveRequest>(`/leave-requests?${query}`);
}

export async function fetchApprovedLeaves(
  therapistId: string,
  dateFrom: string,
  dateTo: string,
): Promise<{ leaves: ApprovedLeaveSummary[] }> {
  const qs = new URLSearchParams({
    therapistId,
    dateFrom,
    dateTo,
  });
  return apiRequest<{ leaves: ApprovedLeaveSummary[] }>(`/leave-requests/approved?${qs.toString()}`);
}

export async function createLeaveRequest(payload: CreateLeavePayload): Promise<{
  leaveRequest: LeaveRequest;
  affectedBookings: AffectedBooking[];
  autoApproved?: boolean;
}> {
  return apiRequest('/leave-requests', {
    method: 'POST',
    body: payload,
  });
}

export async function getLeaveConflicts(
  id: string,
): Promise<{ affectedBookings: AffectedBooking[] }> {
  return apiRequest<{ affectedBookings: AffectedBooking[] }>(
    `/leave-requests/${id}/conflicts`,
  );
}

export async function approveLeaveRequest(
  id: string,
  adminNotes?: string,
): Promise<{ leaveRequest: LeaveRequest; affectedBookings: AffectedBooking[] }> {
  return apiRequest(`/leave-requests/${id}/approve`, {
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

export async function updateLeaveRequest(
  id: string,
  payload: UpdateLeavePayload,
): Promise<{ leaveRequest: LeaveRequest; affectedBookings: AffectedBooking[] }> {
  return apiRequest(`/leave-requests/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function fetchBookingsNeedingAttention(
  therapistId?: string,
): Promise<{ bookings: BookingNeedingAttention[] }> {
  const qs = therapistId ? `?therapistId=${therapistId}` : '';
  return apiRequest<{ bookings: BookingNeedingAttention[] }>(`/bookings/needs-attention${qs}`);
}
