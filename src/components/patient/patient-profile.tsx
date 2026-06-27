'use client';

import { fetchPatientBookings, fetchPatientProfile } from '@/lib/booking-api';
import { listTreatmentPlans } from '@/lib/treatment-plan-api';
import type { Booking, PatientProfile, TreatmentPlan } from '@/lib/types';
import { cn, formatDate, formatDateTime, getPatientName, getTherapistName } from '@/lib/utils';
import { BookingStatusBadge } from '@/components/booking/booking-status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  History,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Stethoscope,
  User,
  Package,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

function formatDateTimeLocal(date: string): string {
  return formatDateTime(date);
}

function TreatmentPlanStatusBadge({ status }: { status: TreatmentPlan['status'] }) {
  const variants: Record<TreatmentPlan['status'], 'default' | 'success' | 'destructive' | 'muted'> = {
    ACTIVE: 'default',
    COMPLETED: 'success',
    EXPIRED: 'destructive',
    CANCELLED: 'muted',
  };
  return <Badge variant={variants[status]}>{status}</Badge>;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function BookingRow({ booking }: { booking: Booking }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-slate-50/50 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-slate-900">
          {booking.therapy?.name ?? (booking.bookingType === 'CONSULTATION' ? 'Consultation' : '—')}
        </p>
        <p className="text-xs text-muted-foreground">
          {booking.therapist ? getTherapistName(booking.therapist) : booking.doctor ? `${booking.doctor.user.firstName} ${booking.doctor.user.lastName}` : '—'} · {booking.room.name}
        </p>
        <p className="text-xs text-muted-foreground">{formatDateTimeLocal(booking.startTime)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs text-muted-foreground">{booking.durationMinutes} min</span>
        <BookingStatusBadge status={booking.status} />
      </div>
    </div>
  );
}

interface PatientProfileViewProps {
  patientId: string;
}

export function PatientProfileView({ patientId }: PatientProfileViewProps) {
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileResult, bookingList, plansResult] = await Promise.all([
        fetchPatientProfile(patientId),
        fetchPatientBookings(patientId),
        listTreatmentPlans({ patientId, limit: 50 }),
      ]);
      setPatient(profileResult.patient);
      setBookings(bookingList);
      setTreatmentPlans(plansResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patient profile');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const now = useMemo(() => new Date(), [bookings]);

  const upcomingAppointments = useMemo(
    () =>
      bookings
        .filter(
          (b) =>
            new Date(b.startTime) >= now &&
            ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'].includes(b.status),
        )
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [bookings, now],
  );

  const visitHistory = useMemo(
    () =>
      [...bookings]
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
        .slice(0, 10),
    [bookings],
  );

  const previousTherapies = useMemo(() => {
    const completed = bookings.filter((b) => b.status === 'COMPLETED');
    const byTherapy = new Map<
      string,
      { therapy: Booking['therapy']; count: number; lastDate: string }
    >();
    for (const booking of completed) {
      if (!booking.therapyId || !booking.therapy) continue;
      const existing = byTherapy.get(booking.therapyId);
      if (existing) {
        existing.count += 1;
        if (new Date(booking.startTime) > new Date(existing.lastDate)) {
          existing.lastDate = booking.startTime;
        }
      } else {
        byTherapy.set(booking.therapyId, {
          therapy: booking.therapy,
          count: 1,
          lastDate: booking.startTime,
        });
      }
    }
    return Array.from(byTherapy.values()).sort(
      (a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime(),
    );
  }, [bookings]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading patient profile…</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/patients">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Patients
          </Link>
        </Button>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {error ?? 'Patient not found'}
        </div>
      </div>
    );
  }

  const age = patient.dateOfBirth
    ? Math.floor(
        (Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      )
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="-ml-2 h-8" asChild>
            <Link href="/admin/patients">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Patients
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {getPatientName(patient)}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{patient.medicalRecordNo}</Badge>
                <Badge variant={patient.isActive ? 'success' : 'muted'}>
                  {patient.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {patient._count && (
                  <span className="text-xs text-muted-foreground">
                    {patient._count.bookings} total visit{patient._count.bookings === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/patients/${patientId}/edit`}>Edit patient</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void loadData()}>
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <SectionCard icon={User} title="Patient Information">
            <dl className="space-y-3">
              <InfoRow label="Date of Birth" value={formatDate(patient.dateOfBirth)} />
              {age !== null && <InfoRow label="Age" value={`${age} years`} />}
              <InfoRow label="Gender" value={patient.gender} />
              <InfoRow label="Nationality" value={patient.nationality} />
              <InfoRow label="Emirates ID" value={patient.emiratesId} />
              <Separator />
              {patient.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{patient.phone}</span>
                </div>
              )}
              {patient.alternatePhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{patient.alternatePhone} (alt)</span>
                </div>
              )}
              {patient.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{patient.email}</span>
                </div>
              )}
              {(patient.address || patient.city || patient.emirate) && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    {[patient.address, patient.city, patient.emirate].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              {patient.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Notes
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{patient.notes}</p>
                  </div>
                </>
              )}
            </dl>
          </SectionCard>

          <SectionCard icon={CreditCard} title="Insurance Information">
            {patient.insurances.length === 0 ? (
              <p className="text-sm text-muted-foreground">No insurance on file</p>
            ) : (
              <div className="space-y-4">
                {patient.insurances.map((insurance) => (
                  <div
                    key={insurance.id}
                    className={cn(
                      'rounded-lg border p-3',
                      insurance.isPrimary && 'border-primary/30 bg-primary/5',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {insurance.insuranceProvider.name}
                      </p>
                      {insurance.isPrimary && (
                        <Badge variant="default" className="text-[10px]">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <dl className="mt-2 space-y-1.5">
                      <InfoRow label="Policy" value={insurance.policyNumber} />
                      <InfoRow label="Member ID" value={insurance.memberId} />
                      <InfoRow label="Plan" value={insurance.planName} />
                      <InfoRow
                        label="Coverage"
                        value={
                          insurance.coveragePercent
                            ? `${insurance.coveragePercent}%`
                            : undefined
                        }
                      />
                      <InfoRow
                        label="Valid"
                        value={
                          insurance.validFrom || insurance.validTo
                            ? `${formatDate(insurance.validFrom)} – ${formatDate(insurance.validTo)}`
                            : undefined
                        }
                      />
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-muted-foreground">Authorization</span>
                        <Badge
                          variant={
                            insurance.authorizationStatus === 'APPROVED'
                              ? 'success'
                              : insurance.authorizationStatus === 'DENIED'
                                ? 'destructive'
                                : 'warning'
                          }
                          className="text-[10px]"
                        >
                          {insurance.authorizationStatus}
                        </Badge>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <SectionCard icon={Calendar} title="Upcoming Appointments">
            {upcomingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming appointments</p>
            ) : (
              <div className="space-y-2">
                {upcomingAppointments.map((booking) => (
                  <BookingRow key={booking.id} booking={booking} />
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard icon={Package} title="Treatment Plans">
            {treatmentPlans.length === 0 ? (
              <p className="text-sm text-muted-foreground">No treatment plans on file</p>
            ) : (
              <div className="space-y-4">
                {treatmentPlans.map((plan) => (
                  <div key={plan.id} className="rounded-lg border bg-slate-50/50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">{plan.therapy.name}</p>
                      <TreatmentPlanStatusBadge status={plan.status} />
                    </div>
                    <dl className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      <div>Total sessions: {plan.totalSessions}</div>
                      <div>Completed: {plan.completedSessions}</div>
                      <div>Remaining: {plan.remainingSessions}</div>
                      <div>Expiry: {formatDate(plan.expiryDate)}</div>
                    </dl>
                    {plan.sessions && plan.sessions.length > 0 && (
                      <div className="mt-3 border-t pt-2">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Session history
                        </p>
                        <div className="space-y-1">
                          {plan.sessions.map((session) => (
                            <div
                              key={session.id}
                              className="flex flex-wrap items-center justify-between gap-2 text-xs"
                            >
                              <span>
                                Session {session.sessionNumber} ·{' '}
                                {session.booking.therapist
                                  ? getTherapistName(session.booking.therapist)
                                  : '—'}
                              </span>
                              <span>{formatDateTimeLocal(session.completedAt)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard icon={Stethoscope} title="Previous Therapies">
            {previousTherapies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed therapies yet</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {previousTherapies.map(({ therapy, count, lastDate }) => (
                  <div key={therapy?.id ?? lastDate} className="rounded-lg border bg-slate-50/50 p-3">
                    <p className="text-sm font-medium text-slate-900">{therapy?.name ?? '—'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {count} session{count === 1 ? '' : 's'} · Last: {formatDate(lastDate)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {therapy?.durationMinutes ?? 0} min per session
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard icon={History} title="Visit History">
            {visitHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No visit history</p>
            ) : (
              <div className="space-y-2">
                {visitHistory.map((booking) => (
                  <BookingRow key={booking.id} booking={booking} />
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
