'use client';

import type { TherapistSearchResult } from '@/lib/booking-api';
import { getTherapistSearchMinLength } from '@/lib/booking-api';
import { getTherapist } from '@/lib/therapist-api';
import type { Therapist } from '@/lib/types';
import { cn, getTherapistColor, getTherapistName } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const SEARCH_DEBOUNCE_MS = 300;

interface TherapistSearchProps {
  value?: string;
  onChange: (therapistId: string, therapist?: Therapist) => void;
  onSearch: (query: string, page?: number) => Promise<TherapistSearchResult>;
  knownTherapists?: Therapist[];
  disabled?: boolean;
  error?: boolean;
}

export function TherapistSearch({
  value,
  onChange,
  onSearch,
  knownTherapists = [],
  disabled,
  error,
}: TherapistSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRequestIdRef = useRef(0);

  const minSearchLength = getTherapistSearchMinLength(query);

  useEffect(() => {
    if (!value) {
      setSelectedTherapist(null);
      return;
    }

    const known = knownTherapists.find((therapist) => therapist.id === value);
    if (known) {
      setSelectedTherapist(known);
      return;
    }

    if (selectedTherapist?.id === value) return;

    const therapistId = value;
    let cancelled = false;
    async function loadSelected() {
      setLoading(true);
      try {
        const { therapist } = await getTherapist(therapistId);
        if (cancelled) return;
        setSelectedTherapist(therapist);
      } catch {
        if (!cancelled) setSelectedTherapist(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadSelected();
    return () => {
      cancelled = true;
    };
  }, [value, knownTherapists, selectedTherapist?.id]);

  const runSearch = useCallback(
    async (searchQuery: string, searchPage: number, append: boolean) => {
      const trimmed = searchQuery.trim();
      const requiredLength = getTherapistSearchMinLength(trimmed);
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
        setResults((prev) => (append ? [...prev, ...result.therapists] : result.therapists));
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

  function handleSelect(therapist: Therapist) {
    setSelectedTherapist(therapist);
    onChange(therapist.id, therapist);
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
            !selectedTherapist && 'text-muted-foreground',
            error && 'border-destructive',
          )}
        >
          {loading && !selectedTherapist && value ? (
            'Loading therapist…'
          ) : selectedTherapist ? (
            <span className="flex items-center gap-2 truncate">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: getTherapistColor(selectedTherapist.colorCode) }}
              />
              {getTherapistName(selectedTherapist)}
            </span>
          ) : (
            'Search therapist…'
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="border-b p-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, email, specialization…"
            autoFocus
          />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {showMinCharsHint
              ? `Type at least ${minSearchLength} character${minSearchLength === 1 ? '' : 's'} to search`
              : total > 0
                ? `${total.toLocaleString()} match${total === 1 ? '' : 'es'}`
                : 'Search across all therapists'}
          </p>
        </div>
        <div ref={listRef} className="max-h-60 overflow-y-auto p-1">
          {showMinCharsHint ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Enter {minSearchLength}+ character{minSearchLength === 1 ? '' : 's'} to search therapists
            </p>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {query.trim() ? 'No therapists found' : 'Start typing to search therapists'}
            </p>
          ) : (
            <>
              {results.map((therapist) => (
                <button
                  key={therapist.id}
                  type="button"
                  onClick={() => handleSelect(therapist)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
                >
                  <Check
                    className={cn(
                      'h-4 w-4',
                      selectedTherapist?.id === therapist.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: getTherapistColor(therapist.colorCode) }}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="font-medium">{getTherapistName(therapist)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {therapist.specialization ?? therapist.user.email}
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
