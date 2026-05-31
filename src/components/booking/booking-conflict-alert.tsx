'use client';

import { AlertCircle } from 'lucide-react';

export interface BookingConflictDetails {
  kind?: 'therapist' | 'room';
  therapistName?: string;
  patientName?: string;
  roomName?: string;
  startTimeFormatted?: string;
  endTimeFormatted?: string;
  message?: string;
}

interface BookingConflictAlertProps {
  details?: BookingConflictDetails | null;
  fallbackMessage?: string;
}

export function BookingConflictAlert({ details, fallbackMessage }: BookingConflictAlertProps) {
  if (!details && !fallbackMessage) return null;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-2">
          <p className="font-semibold">Booking Conflict Detected</p>
          {details ? (
            <dl className="space-y-1 text-xs sm:text-sm">
              {details.therapistName && (
                <div>
                  <dt className="inline font-medium">Therapist: </dt>
                  <dd className="inline">{details.therapistName}</dd>
                </div>
              )}
              {details.message && (
                <div>
                  <dt className="font-medium">Already booked:</dt>
                  <dd>{details.message}</dd>
                </div>
              )}
              {(details.startTimeFormatted || details.endTimeFormatted) && !details.message && (
                <div>
                  <dt className="font-medium">Already booked:</dt>
                  <dd>
                    {details.startTimeFormatted} – {details.endTimeFormatted}
                  </dd>
                </div>
              )}
              {details.patientName && (
                <div>
                  <dt className="inline font-medium">Patient: </dt>
                  <dd className="inline">{details.patientName}</dd>
                </div>
              )}
              {details.roomName && (
                <div>
                  <dt className="inline font-medium">Room: </dt>
                  <dd className="inline">{details.roomName}</dd>
                </div>
              )}
              <p className="pt-1 text-red-700">Please select another slot.</p>
            </dl>
          ) : (
            <p>{fallbackMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function parseConflictDetails(error: unknown): BookingConflictDetails | null {
  if (error && typeof error === 'object') {
    if ('details' in error) {
      const details = (error as { details?: BookingConflictDetails }).details;
      if (details && typeof details === 'object') return details;
    }
  }
  return null;
}
