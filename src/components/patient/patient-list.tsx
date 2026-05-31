'use client';

import { ActiveStatusBadge } from '@/components/shared/active-status-badge';
import { ListToolbar, statusFilterToIsActive, type StatusFilter } from '@/components/shared/list-toolbar';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { listPatientInsurances } from '@/lib/insurance-api';
import { listPatients } from '@/lib/patient-api';
import type { PaginatedMeta, PatientInsurance, PatientListItem } from '@/lib/types';
import { getPatientName } from '@/lib/utils';
import { Eye, Pencil, Plus } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type InsuranceSummary = {
  providerName: string;
  status: string;
  isPrimary: boolean;
} | null;

const DEFAULT_META: PaginatedMeta = { page: 1, limit: 20, total: 0, totalPages: 0 };

export function PatientList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta>(DEFAULT_META);
  const [insuranceMap, setInsuranceMap] = useState<Record<string, InsuranceSummary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search);

  const loadInsuranceSummaries = useCallback(async (rows: PatientListItem[]) => {
    const entries = await Promise.all(
      rows.map(async (patient) => {
        try {
          const { data } = await listPatientInsurances(patient.id, { limit: 5 });
          const primary = data.find((i: PatientInsurance) => i.isPrimary) ?? data[0];
          if (!primary) return [patient.id, null] as const;
          return [
            patient.id,
            {
              providerName: primary.insuranceProvider.name,
              status: primary.authorizationStatus,
              isPrimary: primary.isPrimary,
            },
          ] as const;
        } catch {
          return [patient.id, null] as const;
        }
      }),
    );
    setInsuranceMap(Object.fromEntries(entries));
  }, []);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listPatients({
        page,
        limit,
        search: debouncedSearch,
        isActive: statusFilterToIsActive(statusFilter),
      });
      setPatients(result.data);
      setMeta(result.meta);
      void loadInsuranceSummaries(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter, loadInsuranceSummaries]);

  useEffect(() => {
    void loadPatients();
  }, [loadPatients]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, MRN, phone, email…"
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        actions={
          <Button asChild>
            <Link href="/admin/patients/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Patient
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {error && (
            <p className="border-b p-4 text-sm text-destructive">{error}</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Patient</th>
                  <th className="px-4 py-3 font-medium">MRN</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Phone</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Insurance</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      Loading patients…
                    </td>
                  </tr>
                ) : patients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      No patients found
                    </td>
                  </tr>
                ) : (
                  patients.map((patient) => {
                    const insurance = insuranceMap[patient.id];
                    return (
                      <tr key={patient.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/patients/${patient.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {getPatientName(patient)}
                          </Link>
                          {patient.email && (
                            <p className="text-xs text-muted-foreground">{patient.email}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{patient.medicalRecordNo}</td>
                        <td className="hidden px-4 py-3 md:table-cell">{patient.phone ?? '—'}</td>
                        <td className="hidden px-4 py-3 lg:table-cell">
                          {insurance ? (
                            <div className="space-y-1">
                              <p className="font-medium">{insurance.providerName}</p>
                              <Badge
                                variant={
                                  insurance.status === 'APPROVED'
                                    ? 'success'
                                    : insurance.status === 'DENIED'
                                      ? 'destructive'
                                      : 'warning'
                                }
                                className="text-[10px]"
                              >
                                {insurance.status}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <ActiveStatusBadge isActive={patient.isActive} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" asChild title="View profile">
                              <Link href={`/admin/patients/${patient.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon" asChild title="Edit">
                              <Link href={`/admin/patients/${patient.id}/edit`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
