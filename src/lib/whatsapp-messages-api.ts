import { getToken, clearAuth } from './auth';
import type { PaginatedMeta } from './types';
import { ApiRequestError, apiRequest } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export type WhatsAppConversationSummary = {
  waId: string;
  contactName: string | null;
  patientName: string | null;
  lastMessageText: string | null;
  lastMessageAt: string;
  lastDirection: 'inbound' | 'outbound' | null;
  messageCount: number;
};

export type WhatsAppConversationMessage = {
  id: string;
  direction: 'inbound' | 'outbound';
  kind: 'message' | 'auto_reply' | 'appointment_notification' | 'reaction';
  text: string;
  sentAt: string;
  messageId?: string | null;
  status?: string | null;
  processingNote?: string | null;
  source: 'webhook' | 'audit' | 'reconstructed';
};

export type WhatsAppConversationDetail = {
  conversation: {
    waId: string;
    contactName: string | null;
    patientName: string | null;
    messageCount: number;
  };
  messages: WhatsAppConversationMessage[];
};

export async function listWhatsAppConversations(params: {
  search?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ data: WhatsAppConversationSummary[]; meta: PaginatedMeta }> {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.search?.trim()) search.set('search', params.search.trim());
  const qs = search.toString();

  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/whatsapp-messages/conversations${qs ? `?${qs}` : ''}`, {
    headers,
    credentials: 'omit',
  });

  if (response.status === 401) clearAuth();

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
    data?: WhatsAppConversationSummary[];
    meta?: PaginatedMeta;
  };

  return {
    data: Array.isArray(payload.data) ? payload.data : [],
    meta: payload.meta ?? { page: 1, limit: 40, total: 0, totalPages: 0 },
  };
}

export async function getWhatsAppConversation(waId: string): Promise<WhatsAppConversationDetail> {
  const data = await apiRequest<WhatsAppConversationDetail>(
    `/whatsapp-messages/conversations/${encodeURIComponent(waId)}`,
  );
  return {
    conversation: data.conversation,
    messages: Array.isArray(data.messages) ? data.messages : [],
  };
}
