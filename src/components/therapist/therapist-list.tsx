'use client';

import { ActiveStatusBadge } from '@/components/shared/active-status-badge';
import { ListToolbar, statusFilterToIsActive, type StatusFilter } from '@/components/shared/list-toolbar';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { listTherapists } from '@/lib/therapist-api';
import type { PaginatedMeta, TherapistListItem } from '@/lib/types';
import { getTherapistColor, getTherapistName } from '@/lib/utils';
import { Eye, Pencil, Plus } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

const DEFAULT_META: PaginatedMeta = { page: 1, limit: 20, total: 0, totalPages: 0 };

export function TherapistList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [therapists, setTherapists] = useState<TherapistListItem[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta>(DEFAULT_META);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listTherapists({
        page,
        limit,
        search: debouncedSearch,
        isActive: statusFilterToIsActive(statusFilter),
      });
      setTherapists(result.data);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load therapists');
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

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, email, specialization…"
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        actions={
          <Button asChild>
            <Link href="/admin/therapists/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Therapist
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
                  <th className="px-4 py-3 font-medium">Therapist</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Email</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Phone</th>
                  <th className="px-4 py-3 font-medium">Hours</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      Loading therapists…
                    </td>
                  </tr>
                ) : therapists.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      No therapists found
                    </td>
                  </tr>
                ) : (
                  therapists.map((therapist) => (
                    <tr key={therapist.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: getTherapistColor(therapist.colorCode) }}
                          />
                          <Link
                            href={`/admin/therapists/${therapist.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {getTherapistName(therapist)}
                          </Link>
                        </div>
                        {therapist.specialization && (
                          <p className="text-xs text-muted-foreground">{therapist.specialization}</p>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">{therapist.user.email}</td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        {therapist.user.phone ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {therapist.consultationStartTime && therapist.consultationEndTime
                          ? `${therapist.consultationStartTime} – ${therapist.consultationEndTime}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <ActiveStatusBadge isActive={therapist.isActive} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/admin/therapists/${therapist.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/admin/therapists/${therapist.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
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
