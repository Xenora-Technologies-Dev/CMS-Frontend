import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { APP_NAME, APP_VERSION } from '@/lib/version';
import { AuthProvider } from '@/components/auth/auth-provider';
import { ClinicProvider } from '@/components/providers/clinic-provider';
import { NotificationsProvider } from '@/components/providers/notifications-provider';
import { SocketProvider } from '@/components/providers/socket-provider';
import { ToastProvider } from '@/components/providers/toast-provider';
import { BookingWhatsAppProvider } from '@/components/whatsapp/booking-whatsapp-provider';
import { WhatsAppInboxAlertProvider } from '@/components/whatsapp/whatsapp-inbox-alert-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: `${APP_NAME} v${APP_VERSION}`,
  description: 'Clinic Therapy & Appointment Management System',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ClinicProvider>
            <BookingWhatsAppProvider>
              <SocketProvider>
                <NotificationsProvider>
                  <WhatsAppInboxAlertProvider>
                    <ToastProvider>{children}</ToastProvider>
                  </WhatsAppInboxAlertProvider>
                </NotificationsProvider>
              </SocketProvider>
            </BookingWhatsAppProvider>
          </ClinicProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
