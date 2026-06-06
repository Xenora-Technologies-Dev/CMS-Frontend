'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TreatmentPlan } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { Package } from 'lucide-react';

export type PackageChoice = 'continue' | 'new' | null;

interface PackageSelectionPanelProps {
  plan: TreatmentPlan | null;
  loading: boolean;
  choice: PackageChoice;
  onChoiceChange: (choice: PackageChoice) => void;
}

export function PackageSelectionPanel({
  plan,
  loading,
  choice,
  onChoiceChange,
}: PackageSelectionPanelProps) {
  if (loading) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Checking for existing treatment packages…
        </CardContent>
      </Card>
    );
  }

  if (!plan) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-4 w-4 text-primary" />
          Existing Package Found
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-1 rounded-md border bg-white/80 p-3">
          <p>
            <span className="text-muted-foreground">Therapy:</span>{' '}
            <span className="font-medium">{plan.therapy.name}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Sessions completed:</span>{' '}
            <span className="font-medium">{plan.completedSessions}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Remaining sessions:</span>{' '}
            <span className="font-medium">{plan.remainingSessions}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Expiry date:</span>{' '}
            <span className="font-medium">{formatDateTime(plan.expiryDate)}</span>
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant={choice === 'continue' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => onChoiceChange('continue')}
          >
            Continue Existing Package
          </Button>
          <Button
            type="button"
            variant={choice === 'new' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => onChoiceChange('new')}
          >
            Create New Package
          </Button>
        </div>
        {!choice && (
          <p className="text-xs text-destructive">Select how to handle this package-based therapy.</p>
        )}
      </CardContent>
    </Card>
  );
}
