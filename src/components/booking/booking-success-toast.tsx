'use client';

import { Button } from '@/components/ui/button';
import {
  autoDownloadAppointmentSlip,
  downloadAppointmentSlipPdf,
  printAppointmentSlipPdf,
} from '@/lib/appointment-slip-utils';
import type { Booking } from '@/lib/types';
import { getPatientName, getTherapistName } from '@/lib/utils';
import { CheckCircle2, Download, ExternalLink, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BookingSuccessToastProps {
  booking: Booking;
  onDismiss: () => void;
}

export function BookingSuccessToast({ booking, onDismiss }: BookingSuccessToastProps) {
  const [slipLoading, setSlipLoading] = useState<'view' | 'download' | null>(null);
  const [slipError, setSlipError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 15_000);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  useEffect(() => {
    let cancelled = false;
    void autoDownloadAppointmentSlip(booking).catch((err) => {
      if (!cancelled) {
        setSlipError(err instanceof Error ? err.message : 'Failed to download appointment slip');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [booking]);

  const therapyTime = new Date(booking.startTime).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  async function handleViewSlip() {
    setSlipError(null);
    setSlipLoading('view');
    try {
      await printAppointmentSlipPdf(booking);
    } catch (err) {
      setSlipError(err instanceof Error ? err.message : 'Failed to open appointment slip');
    } finally {
      setSlipLoading(null);
    }
  }

  async function handleDownloadSlip() {
    setSlipError(null);
    setSlipLoading('download');
    try {
      await downloadAppointmentSlipPdf(booking);
    } catch (err) {
      setSlipError(err instanceof Error ? err.message : 'Failed to download appointment slip');
    } finally {
      setSlipLoading(null);
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[100] w-[min(calc(100vw-2rem),24rem)] animate-in slide-in-from-bottom-4 fade-in"
    >
      <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-lg ring-1 ring-black/5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-emerald-900">Booking Success</p>
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <dl className="mt-2 space-y-1 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Patient</dt>
                <dd className="font-medium text-slate-900">{getPatientName(booking.patient)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Time of Therapy</dt>
                <dd className="font-medium text-slate-900">
                  {booking.therapy?.name ?? 'Appointment'} · {therapyTime}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Therapist</dt>
                <dd className="font-medium text-slate-900">
                  {booking.therapist ? getTherapistName(booking.therapist) : '—'}
                </dd>
              </div>
            </dl>

            {slipError && <p className="mt-2 text-xs text-destructive">{slipError}</p>}

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={slipLoading !== null}
                onClick={() => void handleViewSlip()}
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                {slipLoading === 'view' ? 'Opening…' : 'View Appointment Slip'}
              </Button>
              <Button
                size="sm"
                disabled={slipLoading !== null}
                onClick={() => void handleDownloadSlip()}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {slipLoading === 'download' ? 'Downloading…' : 'Download Appointment Slip'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
