'use client';

import type { TherapySearchResult } from '@/lib/booking-api';
import { getTherapySearchMinLength } from '@/lib/booking-api';
import { getTherapy } from '@/lib/therapy-api';
import type { Therapy } from '@/lib/types';
import { cn, formatDuration } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const SEARCH_DEBOUNCE_MS = 300;

interface TherapySearchProps {
  value?: string;
  onChange: (therapyId: string, therapy?: Therapy) => void;
  onSearch: (query: string, page?: number) => Promise<TherapySearchResult>;
  knownTherapies?: Therapy[];
  disabled?: boolean;
  error?: boolean;
}

function toTherapyOption(therapy: {
  id: string;
  name: string;
  code?: string | null;
  durationMinutes: number;
  isPackageBased?: boolean;
  packageSessions?: number | null;
  packageValidityDays?: number | null;
}): Therapy {
  return {
    id: therapy.id,
    name: therapy.name,
    code: therapy.code,
    durationMinutes: therapy.durationMinutes,
    isPackageBased: therapy.isPackageBased,
    packageSessions: therapy.packageSessions,
    packageValidityDays: therapy.packageValidityDays,
  };
}

export function TherapySearch({
  value,
  onChange,
  onSearch,
  knownTherapies = [],
  disabled,
  error,
}: TherapySearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Therapy[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedTherapy, setSelectedTherapy] = useState<Therapy | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRequestIdRef = useRef(0);

  const minSearchLength = getTherapySearchMinLength(query);

  useEffect(() => {
    if (!value) {
      setSelectedTherapy(null);
      return;
    }

    const known = knownTherapies.find((therapy) => therapy.id === value);
    if (known) {
      setSelectedTherapy(known);
      return;
    }

    if (selectedTherapy?.id === value) return;

    const therapyId = value;
    let cancelled = false;
    async function loadSelected() {
      setLoading(true);
      try {
        const { therapy } = await getTherapy(therapyId);
        if (cancelled) return;
        setSelectedTherapy(toTherapyOption(therapy));
      } catch {
        if (!cancelled) setSelectedTherapy(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadSelected();
    return () => {
      cancelled = true;
    };
  }, [value, knownTherapies, selectedTherapy?.id]);

  const runSearch = useCallback(
    async (searchQuery: string, searchPage: number, append: boolean) => {
      const trimmed = searchQuery.trim();
      const requiredLength = getTherapySearchMinLength(trimmed);
      if (trimmed.length > 0 && trimmed.length < requiredLength) {
        setResults([]);
        setHasMore(false);
        setTotal(0);
        return;
      }

      const requestId = ++searchRequestIdRef.current;
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const result = await onSearch(trimmed, searchPage);
        if (requestId !== searchRequestIdRef.current) return;
        setResults((prev) => (append ? [...prev, ...result.therapies] : result.therapies));
        setHasMore(result.hasMore);
        setTotal(result.total);
        setPage(searchPage);
      } finally {
        if (requestId === searchRequestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
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

  function handleSelect(therapy: Therapy) {
    setSelectedTherapy(therapy);
    onChange(therapy.id, therapy);
    setOpen(false);
  }

  function handleLoadMore() {
    if (loadingMore || !hasMore) return;
    void runSearch(query, page + 1, true);
  }

  const showMinCharsHint =
    open && query.trim().length > 0 && query.trim().length < minSearchLength;

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
            !selectedTherapy && 'text-muted-foreground',
            error && 'border-destructive',
          )}
        >
          {loading && !selectedTherapy && value
            ? 'Loading therapy…'
            : selectedTherapy
              ? `${selectedTherapy.name} (${formatDuration(selectedTherapy.durationMinutes)})`
              : 'Search therapy…'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="border-b p-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or code…"
            autoFocus
          />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {showMinCharsHint
              ? `Type at least ${minSearchLength} character${minSearchLength === 1 ? '' : 's'} to search`
              : total > 0
                ? `${total.toLocaleString()} match${total === 1 ? '' : 'es'}`
                : 'Search across all therapies'}
          </p>
        </div>
        <div ref={listRef} className="max-h-60 overflow-y-auto p-1">
          {showMinCharsHint ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Enter {minSearchLength}+ character{minSearchLength === 1 ? '' : 's'} to search therapies
            </p>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {query.trim() ? 'No therapies found' : 'Start typing to search therapies'}
            </p>
          ) : (
            <>
              {results.map((therapy) => (
                <button
                  key={therapy.id}
                  type="button"
                  onClick={() => handleSelect(therapy)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
                >
                  <Check
                    className={cn(
                      'h-4 w-4',
                      selectedTherapy?.id === therapy.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="flex-1">
                    <span className="font-medium">{therapy.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatDuration(therapy.durationMinutes)}
                      {therapy.code ? ` · ${therapy.code}` : ''}
                      {therapy.isPackageBased ? ' · Package' : ''}
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
