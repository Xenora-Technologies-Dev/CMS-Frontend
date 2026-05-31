import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/components/auth/auth-provider';
import { ClinicProvider } from '@/components/providers/clinic-provider';
import { SocketProvider } from '@/components/providers/socket-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CliniqFlow',
  description: 'CliniqFlow — Clinic Therapy & Appointment Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ClinicProvider>
            <SocketProvider>{children}</SocketProvider>
          </ClinicProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
