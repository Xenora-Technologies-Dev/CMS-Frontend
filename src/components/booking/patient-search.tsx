'use client';

import type { PatientSearchResult } from '@/lib/booking-api';
import type { Patient } from '@/lib/types';
import { cn, getPatientName } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getPatient } from '@/lib/patient-api';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;

interface PatientSearchProps {
  value?: string;
  onChange: (patientId: string) => void;
  onSearch: (query: string, page?: number) => Promise<PatientSearchResult>;
  disabled?: boolean;
  error?: boolean;
}

export function PatientSearch({ value, onChange, onSearch, disabled, error }: PatientSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value) {
      setSelectedPatient(null);
      return;
    }
    if (selectedPatient?.id === value) return;

    const patientId = value;
    let cancelled = false;
    async function loadSelected() {
      setLoading(true);
      try {
        const { patient } = await getPatient(patientId);
        if (cancelled) return;
        setSelectedPatient({
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          medicalRecordNo: patient.medicalRecordNo,
          phone: patient.phone,
        });
      } catch {
        if (!cancelled) setSelectedPatient(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadSelected();
    return () => {
      cancelled = true;
    };
  }, [value, selectedPatient?.id]);

  const runSearch = useCallback(
    async (searchQuery: string, searchPage: number, append: boolean) => {
      const trimmed = searchQuery.trim();
      if (trimmed.length > 0 && trimmed.length < MIN_SEARCH_LENGTH) {
        setResults([]);
        setHasMore(false);
        setTotal(0);
        return;
      }

      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const result = await onSearch(trimmed, searchPage);
        setResults((prev) => (append ? [...prev, ...result.patients] : result.patients));
        setHasMore(result.hasMore);
        setTotal(result.total);
        setPage(searchPage);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [onSearch],
  );

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      void runSearch(query, 1, false);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query, runSearch]);

  function handleSelect(patient: Patient) {
    setSelectedPatient(patient);
    onChange(patient.id);
    setOpen(false);
  }

  function handleLoadMore() {
    if (loadingMore || !hasMore) return;
    void runSearch(query, page + 1, true);
  }

  const showMinCharsHint =
    open && query.trim().length > 0 && query.trim().length < MIN_SEARCH_LENGTH;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !selectedPatient && 'text-muted-foreground',
            error && 'border-destructive',
          )}
        >
          {loading && !selectedPatient && value
            ? 'Loading patient…'
            : selectedPatient
              ? `${getPatientName(selectedPatient)} (${selectedPatient.medicalRecordNo})`
              : 'Search patient…'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="border-b p-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, MRN, phone, Emirates ID…"
            autoFocus
          />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Type at least {MIN_SEARCH_LENGTH} characters to search {total > 0 ? `(${total.toLocaleString()} matches)` : ''}
          </p>
        </div>
        <div ref={listRef} className="max-h-60 overflow-y-auto p-1">
          {showMinCharsHint ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Enter {MIN_SEARCH_LENGTH}+ characters to search patients
            </p>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {query.trim() ? 'No patients found' : 'Start typing to search patients'}
            </p>
          ) : (
            <>
              {results.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => handleSelect(patient)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
                >
                  <Check
                    className={cn(
                      'h-4 w-4',
                      selectedPatient?.id === patient.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="flex-1">
                    <span className="font-medium">{getPatientName(patient)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {patient.medicalRecordNo}
                      {patient.phone ? ` · ${patient.phone}` : ''}
                    </span>
                  </span>
                </button>
              ))}
              {hasMore && (
                <div className="border-t p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    disabled={loadingMore}
                    onClick={handleLoadMore}
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Loading…
                      </>
                    ) : (
                      `Load more (${results.length} of ${total.toLocaleString()})`
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
