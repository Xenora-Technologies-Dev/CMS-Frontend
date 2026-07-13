'use client';

import { PaginationControls } from '@/components/shared/pagination-controls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { listAuditLogs, type AuditLogItem } from '@/lib/audit-log-api';
import type { PaginatedMeta } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { History, Loader2, Search, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const DEFAULT_META: PaginatedMeta = { page: 1, limit: 15, total: 0, totalPages: 0 };

function toIsoFromLocalInput(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta>(DEFAULT_META);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search, 400);

  const load = useCallback(async (nextPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const result = await listAuditLogs({
        page: nextPage,
        limit: 15,
        search: debouncedSearch || undefined,
        dateFrom: toIsoFromLocalInput(dateFrom),
        dateTo: toIsoFromLocalInput(dateTo),
      });
      setLogs(result.data);
      setMeta(result.meta);
      setPage(nextPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity log');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, dateFrom, dateTo]);

  useEffect(() => {
    void load(1);
  }, [load]);

  function clearFilters() {
    setSearch('');
    setDateFrom('');
    setDateTo('');
  }

  const hasFilters = Boolean(search || dateFrom || dateTo);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <History className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Activity History</CardTitle>
              <CardDescription>{meta.total} total entries</CardDescription>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
              <Label htmlFor="activity-search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="activity-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Patient, staff, booking, action…"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="activity-from">From (date & time)</Label>
              <Input
                id="activity-from"
                type="datetime-local"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="activity-to">To (date & time)</Label>
              <Input
                id="activity-to"
                type="datetime-local"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
          {hasFilters && (
            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-3.5 w-3.5" />
                Clear filters
              </Button>
            </div>
          )}
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
            <p className="py-12 text-center text-sm text-muted-foreground">
              {hasFilters ? 'No activity matches your filters' : 'No activity recorded yet'}
            </p>
          ) : (
            <ul className="divide-y">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{log.label}</p>
                    <p className="text-sm text-muted-foreground">
                      by {log.actor}
                      {log.actorRole ? ` (${log.actorRole.toLowerCase()})` : ''}
                    </p>
                    {log.detail && (
                      <pre
                        className={`mt-2 max-w-full overflow-x-auto rounded-md border px-3 py-2 text-xs whitespace-pre-wrap ${
                          log.entityType === 'WhatsAppMessage' &&
                          log.newValues &&
                          typeof log.newValues === 'object' &&
                          (log.newValues as Record<string, unknown>).status === 'failed'
                            ? 'border-amber-200 bg-amber-50 text-amber-950'
                            : 'border-slate-200 bg-slate-50 text-muted-foreground'
                        }`}
                      >
                        {log.detail}
                      </pre>
                    )}
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(log.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6">
            <PaginationControls
              meta={{ ...meta, page }}
              onPageChange={(nextPage) => void load(nextPage)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
