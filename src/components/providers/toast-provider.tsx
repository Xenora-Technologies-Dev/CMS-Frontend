'use client';

import { BookingActionToast, type BookingActionToastPayload } from '@/components/booking/booking-action-toast';
import { BookingSuccessToast } from '@/components/booking/booking-success-toast';
import type { BookingWhatsAppStatus } from '@/components/whatsapp/booking-whatsapp-provider';
import type { Booking } from '@/lib/types';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface ToastContextValue {
  showBookingSuccess: (booking: Booking, whatsapp?: BookingWhatsAppStatus | null) => void;
  showBookingAction: (payload: BookingActionToastPayload) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [bookingSuccess, setBookingSuccess] = useState<{
    booking: Booking;
    whatsapp?: BookingWhatsAppStatus | null;
  } | null>(null);
  const [bookingAction, setBookingAction] = useState<BookingActionToastPayload | null>(null);

  const showBookingSuccess = useCallback(
    (booking: Booking, whatsapp?: BookingWhatsAppStatus | null) => {
      setBookingAction(null);
      setBookingSuccess({ booking, whatsapp });
    },
    [],
  );

  const showBookingAction = useCallback((payload: BookingActionToastPayload) => {
    setBookingSuccess(null);
    setBookingAction(payload);
  }, []);

  const value = useMemo(
    () => ({ showBookingSuccess, showBookingAction }),
    [showBookingSuccess, showBookingAction],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {bookingSuccess && (
        <BookingSuccessToast
          booking={bookingSuccess.booking}
          whatsapp={bookingSuccess.whatsapp}
          onDismiss={() => setBookingSuccess(null)}
        />
      )}
      {bookingAction && (
        <BookingActionToast payload={bookingAction} onDismiss={() => setBookingAction(null)} />
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
