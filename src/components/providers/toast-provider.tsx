'use client';

import { BookingSuccessToast } from '@/components/booking/booking-success-toast';
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
  showBookingSuccess: (booking: Booking) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [bookingSuccess, setBookingSuccess] = useState<Booking | null>(null);

  const showBookingSuccess = useCallback((booking: Booking) => {
    setBookingSuccess(booking);
  }, []);

  const value = useMemo(() => ({ showBookingSuccess }), [showBookingSuccess]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {bookingSuccess && (
        <BookingSuccessToast booking={bookingSuccess} onDismiss={() => setBookingSuccess(null)} />
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
