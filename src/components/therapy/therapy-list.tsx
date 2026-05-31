'use client';

import { ActiveStatusBadge } from '@/components/shared/active-status-badge';
import { DurationBadge } from '@/components/shared/duration-badge';
import { ListToolbar, statusFilterToIsActive, type StatusFilter } from '@/components/shared/list-toolbar';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { deleteTherapy, listTherapies } from '@/lib/therapy-api';
import type { PaginatedMeta, TherapyDetail } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

const DEFAULT_META: PaginatedMeta = { page: 1, limit: 20, total: 0, totalPages: 0 };

export function TherapyList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [therapies, setTherapies] = useState<TherapyDetail[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta>(DEFAULT_META);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listTherapies({
        page,
        limit,
        search: debouncedSearch,
        isActive: statusFilterToIsActive(statusFilter),
      });
      setTherapies(result.data);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load therapies');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Deactivate therapy "${name}"?`)) return;
    try {
      await deleteTherapy(id);
      void load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search therapy name or code…"
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        actions={
          <Button asChild>
            <Link href="/admin/therapies/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Therapy
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {error && <p className="border-b p-4 text-sm text-destructive">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Therapy</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Cost</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      Loading therapies…
                    </td>
                  </tr>
                ) : therapies.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      No therapies found
                    </td>
                  </tr>
                ) : (
                  therapies.map((therapy) => (
                    <tr key={therapy.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-medium">{therapy.name}</p>
                        {therapy.code && (
                          <p className="font-mono text-xs text-muted-foreground">{therapy.code}</p>
                        )}
                        {therapy.description && (
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {therapy.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <DurationBadge minutes={therapy.durationMinutes} />
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Used for booking slot length
                        </p>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        {formatCurrency(therapy.price, therapy.currency ?? 'AED')}
                      </td>
                      <td className="px-4 py-3">
                        <ActiveStatusBadge isActive={therapy.isActive} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/admin/therapies/${therapy.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => void handleDelete(therapy.id, therapy.name)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4">
            <PaginationControls
              meta={meta}
              onPageChange={setPage}
              onLimitChange={(l) => {
                setLimit(l);
                setPage(1);
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
