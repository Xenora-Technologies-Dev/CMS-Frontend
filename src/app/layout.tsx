import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/components/auth/auth-provider';
import { ClinicProvider } from '@/components/providers/clinic-provider';
import { NotificationsProvider } from '@/components/providers/notifications-provider';
import { SocketProvider } from '@/components/providers/socket-provider';
import { ToastProvider } from '@/components/providers/toast-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CliniqFlow v1.5',
  description: 'CliniqFlow v1.5 — Clinic Therapy & Appointment Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ClinicProvider>
            <NotificationsProvider>
              <SocketProvider>
                <ToastProvider>{children}</ToastProvider>
              </SocketProvider>
            </NotificationsProvider>
          </ClinicProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
