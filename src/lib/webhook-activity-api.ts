import { getToken, clearAuth } from './auth';
import type { PaginatedMeta } from './types';
import { ApiRequestError, apiRequest } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export interface WebhookActivityItem {
  id: string;
  clinicId?: string | null;
  receivedAt: string;
  direction: string;
  objectType?: string | null;
  wabaId?: string | null;
  field?: string | null;
  eventKind: string;
  phoneNumberId?: string | null;
  displayPhoneNumber?: string | null;
  messageId?: string | null;
  fromWaId?: string | null;
  contactName?: string | null;
  messageType?: string | null;
  messageText?: string | null;
  status?: string | null;
  processingStatus: string;
  processingNote?: string | null;
  payload: unknown;
}

export interface WebhookActivityConfig {
  loggingEnabled: boolean;
  verifyTokenConfigured: boolean;
  callbackUrl: string | null;
  storageOk?: boolean;
  storageMessage?: string | null;
  eventCount?: number | null;
}

export interface WebhookEndpointCheckResult {
  ok: boolean;
  callbackUrl: string | null;
  verifyTokenConfigured: boolean;
  statusCode: number | null;
  challengeMatched: boolean;
  durationMs: number | null;
  bodyPreview: string | null;
  message: string;
  checkedAt: string;
  storageOk?: boolean;
  storageMessage?: string | null;
  eventCount?: number | null;
}

export interface ListWebhookActivityParams {
  page?: number;
  limit?: number;
  eventKind?: string;
  processingStatus?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function unlockWebhookActivity(password: string): Promise<{ unlocked: boolean }> {
  return apiRequest<{ unlocked: boolean }>('/webhook-activity/unlock', {
    method: 'POST',
    body: { password },
  });
}

export async function checkWebhookEndpoint(): Promise<WebhookEndpointCheckResult> {
  return apiRequest<WebhookEndpointCheckResult>('/webhook-activity/check-endpoint', {
    method: 'POST',
  });
}

export async function listWebhookActivity(
  params: ListWebhookActivityParams = {},
): Promise<{
  data: WebhookActivityItem[];
  meta: PaginatedMeta;
  config: WebhookActivityConfig;
}> {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.eventKind) search.set('eventKind', params.eventKind);
  if (params.processingStatus) search.set('processingStatus', params.processingStatus);
  if (params.search?.trim()) search.set('search', params.search.trim());
  if (params.dateFrom) search.set('dateFrom', params.dateFrom);
  if (params.dateTo) search.set('dateTo', params.dateTo);
  const qs = search.toString();

  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/webhook-activity${qs ? `?${qs}` : ''}`, {
    headers,
    credentials: 'omit',
  });

  if (response.status === 401) {
    clearAuth();
  }

  if (!response.ok) {
    try {
      const payload = (await response.json()) as {
        error?: { message?: string; code?: string; details?: unknown };
      };
      throw new ApiRequestError(
        payload.error?.message ?? 'Request failed',
        response.status,
        payload.error?.code,
        payload.error?.details,
      );
    } catch (error) {
      if (error instanceof ApiRequestError) throw error;
      throw new ApiRequestError('Request failed', response.status);
    }
  }

  const payload = (await response.json()) as {
    data?: WebhookActivityItem[];
    meta?: PaginatedMeta;
    config?: WebhookActivityConfig;
  };

  return {
    data: Array.isArray(payload.data) ? payload.data : [],
    meta: payload.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
    config: payload.config ?? {
      loggingEnabled: false,
      verifyTokenConfigured: false,
      callbackUrl: null,
      storageOk: undefined,
      storageMessage: null,
      eventCount: null,
    },
  };
}
