'use client';

import type { Patient } from '@/lib/types';
import { cn, getPatientName } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PatientSearchProps {
  value?: string;
  onChange: (patientId: string) => void;
  onSearch: (query: string) => Promise<Patient[]>;
  disabled?: boolean;
  error?: boolean;
}

export function PatientSearch({ value, onChange, onSearch, disabled, error }: PatientSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  useEffect(() => {
    if (!value) {
      setSelectedPatient(null);
      return;
    }
    if (selectedPatient?.id === value) return;

    let cancelled = false;
    async function loadSelected() {
      setLoading(true);
      try {
        const patients = await onSearch('');
        if (cancelled) return;
        const match = patients.find((p) => p.id === value) ?? null;
        setSelectedPatient(match);
        if (match) setResults(patients);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadSelected();
    return () => {
      cancelled = true;
    };
  }, [value, onSearch, selectedPatient?.id]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const patients = await onSearch(query);
        if (!cancelled) setResults(patients);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query, onSearch]);

  function handleSelect(patient: Patient) {
    setSelectedPatient(patient);
    onChange(patient.id);
    setOpen(false);
  }

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
          {selectedPatient
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
            placeholder="Name, MRN, phone…"
            autoFocus
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No patients found</p>
          ) : (
            results.map((patient) => (
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
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
