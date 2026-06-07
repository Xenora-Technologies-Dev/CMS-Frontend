'use client';

import { PaginationControls } from '@/components/shared/pagination-controls';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { listAuditLogs, type AuditLogItem } from '@/lib/audit-log-api';
import type { PaginatedMeta } from '@/lib/types';
import { History, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const DEFAULT_META: PaginatedMeta = { page: 1, limit: 15, total: 0, totalPages: 0 };

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta>(DEFAULT_META);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const result = await listAuditLogs({ page, limit: 15 });
      setLogs(result.data);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity log');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity Log</h1>
        <p className="text-sm text-muted-foreground">
          All clinic actions and changes recorded for audit purposes
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <History className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Activity History</CardTitle>
              <CardDescription>{meta.total} total entries</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading activity log…
            </div>
          ) : logs.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No activity recorded yet</p>
          ) : (
            <ul className="divide-y">
              {logs.map((log) => (
                <li key={log.id} className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{log.label}</p>
                    <p className="text-sm text-muted-foreground">
                      by {log.actor}
                      {log.actorRole ? ` (${log.actorRole.toLowerCase()})` : ''}
                    </p>
                    {log.entityType && (
                      <p className="text-xs text-muted-foreground">
                        {log.entityType}
                        {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ''}
                      </p>
                    )}
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </time>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6">
            <PaginationControls meta={meta} onPageChange={(page) => void load(page)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
