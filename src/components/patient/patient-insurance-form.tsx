'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createPatientInsurance, listInsuranceProviders } from '@/lib/insurance-api';
import type { InsuranceProvider, PatientInsurance } from '@/lib/types';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PatientInsuranceFormProps {
  patientId: string;
  existing: PatientInsurance[];
  onAdded: () => void;
}

export function PatientInsuranceForm({
  patientId,
  existing,
  onAdded,
}: PatientInsuranceFormProps) {
  const [providers, setProviders] = useState<InsuranceProvider[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerId, setProviderId] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [memberId, setMemberId] = useState('');
  const [planName, setPlanName] = useState('');
  const [coveragePercent, setCoveragePercent] = useState('');
  const [isPrimary, setIsPrimary] = useState(existing.length === 0);

  useEffect(() => {
    listInsuranceProviders({ limit: 100 })
      .then((r) => setProviders(r.data))
      .catch(() => setProviders([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!providerId || !policyNumber.trim()) {
      setError('Provider and policy number are required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createPatientInsurance(patientId, {
        insuranceProviderId: providerId,
        policyNumber: policyNumber.trim(),
        memberId: memberId.trim() || undefined,
        planName: planName.trim() || undefined,
        coveragePercent: coveragePercent ? Number(coveragePercent) : undefined,
        isPrimary,
      });
      setOpen(false);
      setPolicyNumber('');
      setMemberId('');
      setPlanName('');
      setCoveragePercent('');
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add insurance');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add insurance policy
      </Button>
    );
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">New insurance policy</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Insurance provider *</Label>
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="policyNumber">Policy number *</Label>
            <Input
              id="policyNumber"
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="memberId">Member ID</Label>
            <Input id="memberId" value={memberId} onChange={(e) => setMemberId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="planName">Plan name</Label>
            <Input id="planName" value={planName} onChange={(e) => setPlanName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coverage">Coverage %</Label>
            <Input
              id="coverage"
              type="number"
              min={0}
              max={100}
              value={coveragePercent}
              onChange={(e) => setCoveragePercent(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="isPrimary"
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="h-4 w-4 rounded border"
            />
            <Label htmlFor="isPrimary" className="font-normal">
              Primary insurance
            </Label>
          </div>
          {error && (
            <p className="text-sm text-destructive sm:col-span-2">{error}</p>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Save insurance'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
