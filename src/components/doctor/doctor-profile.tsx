'use client';

import { ActiveStatusBadge } from '@/components/shared/active-status-badge';
import { PageActions } from '@/components/shared/page-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDoctor } from '@/lib/doctor-api';
import type { DoctorDetail } from '@/lib/types';
import { getDoctorColor, getDoctorName } from '@/lib/utils';
import { Clock, Mail, Phone, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface DoctorProfileViewProps {
  doctorId: string;
}

export function DoctorProfileView({ doctorId }: DoctorProfileViewProps) {
  const [doctor, setDoctor] = useState<DoctorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { doctor: data } = await getDoctor(doctorId);
      setDoctor(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load doctor');
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading doctor profile…</p>;
  }

  if (error || !doctor) {
    return (
      <div className="space-y-4">
        <PageActions backHref="/admin/doctors" backLabel="← Back to list" />
        <p className="text-sm text-destructive">{error ?? 'Doctor not found'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageActions backHref="/admin/doctors" backLabel="← Back to list">
        <Button asChild>
          <Link href={`/admin/doctors/${doctorId}/edit`}>Edit doctor</Link>
        </Button>
      </PageActions>

      <div className="flex flex-wrap items-start gap-4">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: `${getDoctorColor(doctor.colorCode)}22` }}
        >
          <UserRound
            className="h-8 w-8"
            style={{ color: getDoctorColor(doctor.colorCode) }}
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{getDoctorName(doctor)}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ActiveStatusBadge isActive={doctor.isActive} />
            {doctor.specialization && (
              <span className="text-sm text-muted-foreground">{doctor.specialization}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {doctor.user.email}
            </p>
            {doctor.user.phone && (
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {doctor.user.phone}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Consultation hours</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {doctor.consultationStartTime && doctor.consultationEndTime
                ? `${doctor.consultationStartTime} – ${doctor.consultationEndTime}`
                : 'Not set'}
            </p>
          </CardContent>
        </Card>
      </div>

      {doctor.bio && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bio</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{doctor.bio}</CardContent>
        </Card>
      )}
    </div>
  );
}
