'use client';

import { useClinicOptional } from '@/components/providers/clinic-provider';
import { WhatsAppConfirmationDialog } from '@/components/whatsapp/whatsapp-confirmation-dialog';
import {
  sendBookingWhatsApp,
  type BookingWhatsAppEventType,
  type BookingWhatsAppResult,
} from '@/lib/booking-api';
import {
  isWhatsAppConfirmationPromptEnabled,
  isWhatsAppMessagingEnabled,
} from '@/lib/clinic-api';
import type { Booking } from '@/lib/types';
import { getPatientName } from '@/lib/utils';
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export interface BookingWhatsAppStatus {
  sent?: boolean;
  skipped?: boolean;
  message?: string;
  error?: string;
}

interface NotifyParams {
  booking: Booking;
  eventType: BookingWhatsAppEventType;
  previousStartTime?: string;
}

interface BookingWhatsAppContextValue {
  notifyAfterBookingAction: (params: NotifyParams) => Promise<BookingWhatsAppStatus | null>;
}

const BookingWhatsAppContext = createContext<BookingWhatsAppContextValue | null>(null);

function toStatus(result: BookingWhatsAppResult): BookingWhatsAppStatus {
  return {
    sent: result.sent,
    skipped: result.skipped,
    message: result.message,
    error: result.error,
  };
}

export function BookingWhatsAppProvider({ children }: { children: ReactNode }) {
  const clinicContext = useClinicOptional();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogPatientName, setDialogPatientName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const confirmResolverRef = useRef<((value: boolean) => void) | null>(null);

  const askConfirmation = useCallback((patientName: string) => {
    setDialogPatientName(patientName);
    setIsSending(false);
    setDialogOpen(true);
    return new Promise<boolean>((resolve) => {
      confirmResolverRef.current = resolve;
    });
  }, []);

  const finishConfirmation = useCallback((confirmed: boolean) => {
    if (isSending) return;

    if (confirmed) {
      confirmResolverRef.current?.(true);
      confirmResolverRef.current = null;
      setIsSending(true);
      return;
    }

    setDialogOpen(false);
    confirmResolverRef.current?.(false);
    confirmResolverRef.current = null;
  }, [isSending]);

  const notifyAfterBookingAction = useCallback(
    async ({ booking, eventType, previousStartTime }: NotifyParams) => {
      if (!isWhatsAppMessagingEnabled(clinicContext?.clinic)) {
        return null;
      }

      const patientName = getPatientName(booking.patient);
      const promptEnabled = isWhatsAppConfirmationPromptEnabled(clinicContext?.clinic);

      let shouldSend = true;
      if (promptEnabled) {
        shouldSend = await askConfirmation(patientName);
      } else {
        setDialogPatientName(patientName);
        setIsSending(true);
        setDialogOpen(true);
      }

      if (!shouldSend) {
        return { skipped: true };
      }

      try {
        const result = await sendBookingWhatsApp(booking.id, {
          eventType,
          previousStartTime,
        });
        return toStatus(result);
      } catch (err) {
        return {
          sent: false,
          error:
            err instanceof Error
              ? err.message
              : 'Could not send the WhatsApp message. Please try again later.',
        };
      } finally {
        setIsSending(false);
        setDialogOpen(false);
      }
    },
    [askConfirmation, clinicContext?.clinic],
  );

  return (
    <BookingWhatsAppContext.Provider value={{ notifyAfterBookingAction }}>
      {children}
      <WhatsAppConfirmationDialog
        open={dialogOpen}
        patientName={dialogPatientName}
        sending={isSending}
        onConfirm={() => finishConfirmation(true)}
        onDecline={() => finishConfirmation(false)}
      />
    </BookingWhatsAppContext.Provider>
  );
}

export function useBookingWhatsApp() {
  const context = useContext(BookingWhatsAppContext);
  if (!context) {
    throw new Error('useBookingWhatsApp must be used within BookingWhatsAppProvider');
  }
  return context;
}

export function useBookingWhatsAppOptional() {
  return useContext(BookingWhatsAppContext);
}
