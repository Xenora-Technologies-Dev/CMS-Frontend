'use client';

import type { Booking } from '@/lib/types';
import { formatClinicLocation, getClinicDisplayName, type Clinic } from '@/lib/clinic-api';
import { formatTime, getDoctorName, getPatientName } from '@/lib/utils';
import {
  downloadAppointmentSlipPdf,
  printAppointmentSlipPdf,
} from '@/lib/appointment-slip-utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProgressDialog } from '@/components/shared/progress-dialog';
import { Download, Loader2, Printer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface AppointmentSlipProps {
  booking: Booking | null;
  clinic?: Clinic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  autoDownload?: boolean;
}

export function AppointmentSlipDialog({
  booking,
  clinic,
  open,
  onOpenChange,
  autoDownload = false,
}: AppointmentSlipProps) {
  const [busy, setBusy] = useState<'download' | 'print' | null>(null);
  const [slipError, setSlipError] = useState<string | null>(null);
  const autoDownloadedRef = useRef(false);

  useEffect(() => {
    if (!open || !autoDownload || !booking || autoDownloadedRef.current) return;
    autoDownloadedRef.current = true;
    setBusy('download');
    setSlipError(null);
    void downloadAppointmentSlipPdf(booking)
      .catch((err) => {
        setSlipError(err instanceof Error ? err.message : 'Download failed');
      })
      .finally(() => setBusy(null));
  }, [open, autoDownload, booking]);

  useEffect(() => {
    if (!open) autoDownloadedRef.current = false;
  }, [open]);

  async function handleDownload() {
    if (!booking) return;
    setBusy('download');
    setSlipError(null);
    try {
      await downloadAppointmentSlipPdf(booking);
    } catch (err) {
      setSlipError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setBusy(null);
    }
  }

  async function handlePrint() {
    if (!booking) return;
    setBusy('print');
    setSlipError(null);
    try {
      await printAppointmentSlipPdf(booking);
    } catch (err) {
      setSlipError(err instanceof Error ? err.message : 'Could not open slip for printing');
    } finally {
      setBusy(null);
    }
  }

  if (!booking) return null;

  const clinicName = getClinicDisplayName(clinic);
  const clinicLocation = clinic ? formatClinicLocation(clinic) : null;
  const clinicPhone = clinic?.phone?.trim() || null;

  const appointmentDate = new Date(booking.startTime).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const isBusy = busy !== null;
  const isConsultation = booking.bookingType === 'CONSULTATION';

  return (
    <>
      <ProgressDialog
        open={isBusy}
        title={busy === 'print' ? 'Preparing slip…' : 'Generating PDF…'}
        description="Please wait while we prepare your appointment slip."
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Appointment Confirmation Slip</DialogTitle>
          </DialogHeader>

          <div
            className={
              isConsultation
                ? 'overflow-hidden rounded-xl border-2 border-violet-800'
                : 'overflow-hidden rounded-xl border-2 border-blue-800'
            }
          >
            <div
              className={
                isConsultation
                  ? 'bg-gradient-to-br from-violet-800 to-violet-500 px-6 py-5 text-center text-white sm:px-8 sm:py-6'
                  : 'bg-gradient-to-br from-blue-800 to-blue-500 px-6 py-5 text-center text-white sm:px-8 sm:py-6'
              }
            >
              <h2 className="text-lg font-bold tracking-wide sm:text-xl">{clinicName}</h2>
              {(clinicLocation || clinicPhone) && (
                <p className={`mt-1 text-xs ${isConsultation ? 'text-violet-100' : 'text-blue-100'}`}>
                  {[clinicLocation, clinicPhone].filter(Boolean).join(' · ')}
                </p>
              )}
              <p className="mt-1 text-xs uppercase tracking-[0.2em] opacity-90">
                {isConsultation ? 'Consultation Confirmation' : 'Appointment Confirmation'}
              </p>
            </div>
            <div className="bg-white p-5 sm:p-8">
              <span
                className={
                  isConsultation
                    ? 'inline-block rounded-full bg-violet-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-800'
                    : 'inline-block rounded-full bg-blue-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-800'
                }
              >
                {isConsultation ? 'Confirmed Consultation' : 'Confirmed Appointment'}
              </span>
              <p className="mt-4 text-xl font-bold text-slate-900 sm:text-2xl">
                {getPatientName(booking.patient)}
              </p>
              <p className="text-sm text-slate-500">MRN: {booking.patient.medicalRecordNo}</p>

              <div
                className={
                  isConsultation
                    ? 'mt-5 rounded-lg border border-violet-200 bg-violet-50 p-4 text-center'
                    : 'mt-5 rounded-lg border border-sky-200 bg-sky-50 p-4 text-center'
                }
              >
                <p
                  className={
                    isConsultation
                      ? 'text-sm font-semibold text-violet-700'
                      : 'text-sm font-semibold text-sky-700'
                  }
                >
                  {appointmentDate}
                </p>
                <p
                  className={
                    isConsultation
                      ? 'mt-1 text-2xl font-bold text-violet-900 sm:text-3xl'
                      : 'mt-1 text-2xl font-bold text-sky-900 sm:text-3xl'
                  }
                >
                  {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
                {isConsultation ? (
                  <>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Consultation
                      </p>
                      <p className="font-semibold text-slate-800">Doctor Consultation</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Duration
                      </p>
                      <p className="font-semibold text-slate-800">
                        {booking.durationMinutes} minutes
                      </p>
                    </div>
                    {booking.doctor && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Doctor
                        </p>
                        <p className="font-semibold text-slate-800">
                          {getDoctorName(booking.doctor)}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Mode
                      </p>
                      <p className="font-semibold text-slate-800">
                        {booking.bookingMode === 'CALL' ? 'Call' : 'Walk-In'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Room
                      </p>
                      <p className="font-semibold text-slate-800">{booking.room.name}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Therapy
                      </p>
                      <p className="font-semibold text-slate-800">
                        {booking.therapy?.name ?? '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Duration
                      </p>
                      <p className="font-semibold text-slate-800">
                        {booking.durationMinutes} minutes
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Room
                      </p>
                      <p className="font-semibold text-slate-800">{booking.room.name}</p>
                    </div>
                  </>
                )}
              </div>

              {booking.notes && (
                <p className="mt-4 text-sm text-slate-600">
                  <span className="font-medium">Notes: </span>
                  {booking.notes}
                </p>
              )}

              <div className="mt-5 border-t border-dashed border-slate-200 pt-4 text-center text-xs text-slate-500">
                Please arrive 10 minutes before your appointment.
                <p className="mt-2 font-mono text-[10px] text-slate-400">
                  Ref: {booking.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          {slipError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {slipError}
            </p>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
              disabled={isBusy}
            >
              Close
            </Button>
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => void handlePrint()}
              disabled={isBusy}
            >
              {busy === 'print' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Printer className="mr-2 h-4 w-4" />
              )}
              Print PDF
            </Button>
            <Button className="w-full sm:w-auto" onClick={() => void handleDownload()} disabled={isBusy}>
              {busy === 'download' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
