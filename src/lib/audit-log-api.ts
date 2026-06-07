import { apiRequestPaginated } from './api';
import type { PaginatedMeta } from './types';

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  actor: string;
  actorRole?: string | null;
  actorEmail?: string | null;
  label: string;
  detail?: string;
  oldValues?: unknown;
  newValues?: unknown;
  createdAt: string;
}

export interface ListAuditLogsParams {
  page?: number;
  limit?: number;
  entityType?: string;
  action?: string;
}

export async function listAuditLogs(
  params: ListAuditLogsParams = {},
): Promise<{ data: AuditLogItem[]; meta: PaginatedMeta }> {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.entityType) search.set('entityType', params.entityType);
  if (params.action) search.set('action', params.action);
  const qs = search.toString();
  return apiRequestPaginated<AuditLogItem>(`/audit-logs${qs ? `?${qs}` : ''}`);
}
