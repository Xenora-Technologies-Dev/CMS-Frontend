'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TreatmentPlan } from '@/lib/types';
import { formatDateTime, getTherapistName } from '@/lib/utils';
import { Loader2, Package } from 'lucide-react';

export type PackageChoice = 'continue' | 'new' | null;

const DEFAULT_PACKAGE_VALIDITY_DAYS = '365';

interface PatientPackagesPanelProps {
  plans: TreatmentPlan[];
  loading: boolean;
  selectedPlanId: string | null;
  onSelectPlan: (plan: TreatmentPlan | null) => void;
}

export function PatientPackagesPanel({
  plans,
  loading,
  selectedPlanId,
  onSelectPlan,
}: PatientPackagesPanelProps) {
  if (loading) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking for existing packages…
        </CardContent>
      </Card>
    );
  }

  if (plans.length === 0) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-4 w-4 text-primary" />
          Existing Packages
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {plans.map((plan) => {
          const lastTherapist = plan.sessions?.[0]?.booking?.therapist;
          const isSelected = selectedPlanId === plan.id;
          return (
            <div key={plan.id} className="rounded-md border bg-white/80 p-3">
              <div className="grid gap-1">
                <p>
                  <span className="text-muted-foreground">Therapy:</span>{' '}
                  <span className="font-medium">{plan.therapy.name}</span>
                </p>
                {lastTherapist && (
                  <p>
                    <span className="text-muted-foreground">Last therapist:</span>{' '}
                    <span className="font-medium">{getTherapistName(lastTherapist)}</span>
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">Remaining:</span>{' '}
                  <span className="font-medium">
                    {plan.remainingSessions} of {plan.totalSessions} sessions
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Expires:</span>{' '}
                  <span className="font-medium">{formatDateTime(plan.expiryDate)}</span>
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={isSelected ? 'default' : 'outline'}
                  onClick={() => onSelectPlan(isSelected ? null : plan)}
                >
                  {isSelected ? 'Continuing this package' : 'Continue Package'}
                </Button>
              </div>
            </div>
          );
        })}
        {selectedPlanId && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => onSelectPlan(null)}
          >
            Book without using a package
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface PackageConfigPanelProps {
  isPackage: boolean;
  onIsPackageChange: (value: boolean) => void;
  sessions: string;
  onSessionsChange: (value: string) => void;
  validityDays: string;
  onValidityDaysChange: (value: string) => void;
  disabled?: boolean;
  defaultSessions?: number | null;
}

export function PackageConfigPanel({
  isPackage,
  onIsPackageChange,
  sessions,
  onSessionsChange,
  validityDays,
  onValidityDaysChange,
  disabled,
  defaultSessions,
}: PackageConfigPanelProps) {
  return (
    <Card className="border-slate-200">
      <CardContent className="space-y-4 pt-4">
        <div className="flex items-center gap-2">
          <input
            id="is-package"
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={isPackage}
            onChange={(e) => onIsPackageChange(e.target.checked)}
            disabled={disabled}
          />
          <Label htmlFor="is-package" className="cursor-pointer font-medium">
            Is it a package?
          </Label>
        </div>
        {isPackage && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="package-sessions">Number of sessions *</Label>
              <Input
                id="package-sessions"
                type="number"
                min={1}
                max={100}
                value={sessions}
                placeholder={defaultSessions ? String(defaultSessions) : 'e.g. 10'}
                onChange={(e) => onSessionsChange(e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="package-validity">Validity (days)</Label>
              <Input
                id="package-validity"
                type="number"
                min={1}
                max={3650}
                value={validityDays}
                onChange={(e) => onValidityDaysChange(e.target.value)}
                disabled={disabled}
              />
              <p className="text-[11px] text-muted-foreground">
                Default: {DEFAULT_PACKAGE_VALIDITY_DAYS} days
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function getLastTherapistIdFromPlan(plan: TreatmentPlan): string | undefined {
  return plan.sessions?.[0]?.booking?.therapist?.id;
}
