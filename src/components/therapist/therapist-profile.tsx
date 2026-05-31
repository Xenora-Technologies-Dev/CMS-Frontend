'use client';

import { TherapistAvailabilityPanel } from '@/components/therapist/therapist-availability-panel';
import { TherapistPasswordPanel } from '@/components/therapist/therapist-password-panel';
import { ActiveStatusBadge } from '@/components/shared/active-status-badge';
import { PageActions } from '@/components/shared/page-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTherapist } from '@/lib/therapist-api';
import type { TherapistDetail } from '@/lib/types';
import { getTherapistColor, getTherapistName } from '@/lib/utils';
import { Clock, Mail, Phone, Stethoscope } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface TherapistProfileViewProps {
  therapistId: string;
}

export function TherapistProfileView({ therapistId }: TherapistProfileViewProps) {
  const [therapist, setTherapist] = useState<TherapistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { therapist: data } = await getTherapist(therapistId);
      setTherapist(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load therapist');
    } finally {
      setLoading(false);
    }
  }, [therapistId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading therapist profile…</p>;
  }

  if (error || !therapist) {
    return (
      <div className="space-y-4">
        <PageActions backHref="/admin/therapists" backLabel="← Back to list" />
        <p className="text-sm text-destructive">{error ?? 'Therapist not found'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageActions backHref="/admin/therapists" backLabel="← Back to list">
        <Button asChild>
          <Link href={`/admin/therapists/${therapistId}/edit`}>Edit therapist</Link>
        </Button>
      </PageActions>

      <div className="flex flex-wrap items-start gap-4">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: `${getTherapistColor(therapist.colorCode)}22` }}
        >
          <Stethoscope
            className="h-8 w-8"
            style={{ color: getTherapistColor(therapist.colorCode) }}
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{getTherapistName(therapist)}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ActiveStatusBadge isActive={therapist.isActive} />
            {therapist.specialization && (
              <span className="text-sm text-muted-foreground">{therapist.specialization}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact & account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {therapist.user.email}
            </div>
            {therapist.user.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {therapist.user.phone}
              </div>
            )}
            {therapist.licenseNumber && (
              <p>
                <span className="text-muted-foreground">License: </span>
                {therapist.licenseNumber}
              </p>
            )}
            {therapist.bio && <p className="text-slate-700">{therapist.bio}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Consultation hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            {therapist.consultationStartTime && therapist.consultationEndTime ? (
              <p className="text-lg font-semibold">
                {therapist.consultationStartTime} – {therapist.consultationEndTime}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Not configured</p>
            )}
          </CardContent>
        </Card>
      </div>

      <TherapistPasswordPanel userId={therapist.user.id} email={therapist.user.email} />

      <TherapistAvailabilityPanel therapistId={therapistId} />
    </div>
  );
}
