import type { Booking } from '@/lib/types';
import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export function slipPdfFilename(booking: Booking): string {
  const ref = booking.id.slice(0, 8).toUpperCase();
  const date = new Date(booking.startTime).toISOString().slice(0, 10);
  return `appointment-slip-${date}-${ref}.pdf`;
}

async function fetchSlipPdfBlob(bookingId: string): Promise<Blob> {
  const token = getToken();
  const response = await fetch(`${API_URL}/bookings/${bookingId}/slip`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    let message = 'Failed to download appointment slip';
    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      message = payload.error?.message ?? message;
    } catch {
      // use default message
    }
    throw new Error(message);
  }

  return response.blob();
}

/** Downloads the appointment slip as a PDF file from the backend. */
export async function downloadAppointmentSlipPdf(booking: Booking): Promise<void> {
  const blob = await fetchSlipPdfBlob(booking.id);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = slipPdfFilename(booking);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/** Opens the PDF slip in a new tab for printing. */
export async function printAppointmentSlipPdf(booking: Booking): Promise<void> {
  const blob = await fetchSlipPdfBlob(booking.id);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Auto-download PDF slip after booking creation. */
export async function autoDownloadAppointmentSlip(booking: Booking): Promise<void> {
  await downloadAppointmentSlipPdf(booking);
}
