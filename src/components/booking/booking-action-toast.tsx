'use client';

import type { Booking } from '@/lib/types';
import { formatDateTime, formatTime, getPatientName, getTherapistName } from '@/lib/utils';
import { CalendarClock, CheckCircle2, X, XCircle } from 'lucide-react';
import { useEffect } from 'react';

export type BookingActionType = 'cancel' | 'postpone' | 'complete';

export interface BookingActionToastPayload {
  action: BookingActionType;
  booking: Booking;
  previousStartTime?: string;
  cancellationReason?: string;
  error?: string;
}

interface BookingActionToastProps {
  payload: BookingActionToastPayload;
  onDismiss: () => void;
}

export function BookingActionToast({ payload, onDismiss }: BookingActionToastProps) {
  const { action, booking, previousStartTime, cancellationReason, error } = payload;
  const isCancel = action === 'cancel';
  const isComplete = action === 'complete';
  const isError = Boolean(error);

  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 12_000);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[100] w-[min(calc(100vw-2rem),24rem)] animate-in slide-in-from-bottom-4 fade-in"
    >
      <div
        className={`rounded-xl border bg-white p-4 shadow-lg ring-1 ring-black/5 ${
          isError ? 'border-red-200' : isCancel ? 'border-red-200' : isComplete ? 'border-emerald-200' : 'border-blue-200'
        }`}
      >
        <div className="flex items-start gap-3">
          {isError || isCancel ? (
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          ) : isComplete ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p
                className={`font-semibold ${
                  isError ? 'text-red-900' : isCancel ? 'text-red-900' : isComplete ? 'text-emerald-900' : 'text-blue-900'
                }`}
              >
                {isError
                  ? 'Action failed'
                  : isCancel
                    ? 'Appointment Cancelled'
                    : isComplete
                      ? 'Appointment Completed'
                      : 'Appointment Postponed'}
              </p>
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
                <dt className="text-xs text-muted-foreground">Therapy</dt>
                <dd className="font-medium text-slate-900">
                  {booking.therapy?.name ?? (booking.bookingType === 'CONSULTATION' ? 'Consultation' : '—')}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Therapist</dt>
                <dd className="font-medium text-slate-900">
                  {booking.therapist ? getTherapistName(booking.therapist) : '—'}
                </dd>
              </div>
              {isCancel ? (
                <>
                  <div>
                    <dt className="text-xs text-muted-foreground">Was scheduled</dt>
                    <dd className="font-medium text-slate-900">
                      {formatDateTime(booking.startTime)} – {formatTime(booking.endTime)}
                    </dd>
                  </div>
                  {cancellationReason && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Reason</dt>
                      <dd className="text-slate-800">{cancellationReason}</dd>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {previousStartTime && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Previous time</dt>
                      <dd className="font-medium text-slate-900">{formatDateTime(previousStartTime)}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs text-muted-foreground">New time</dt>
                    <dd className="font-medium text-slate-900">
                      {formatDateTime(booking.startTime)} – {formatTime(booking.endTime)}
                    </dd>
                  </div>
                </>
              )}
              {booking.room && (
                <div>
                  <dt className="text-xs text-muted-foreground">Room</dt>
                  <dd className="font-medium text-slate-900">{booking.room.name}</dd>
                </div>
              )}
            </dl>

            {error ? (
              <p className="mt-3 text-xs text-destructive">{error}</p>
            ) : (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isCancel
                  ? 'Cancellation saved successfully'
                  : isComplete
                    ? 'Booking marked as completed'
                    : 'New schedule saved successfully'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
