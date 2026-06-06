'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { isAuthenticated } from '@/lib/auth';

export function TherapistGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user && !isAuthenticated()) {
      router.replace('/login');
      return;
    }
    if (user && user.role !== 'THERAPIST') {
      router.replace(
        user.role === 'ADMIN' ? '/admin' : user.role === 'DOCTOR' ? '/doctor' : '/login',
      );
    }
  }, [user, loading, router]);

  if (loading || (!user && isAuthenticated())) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user || user.role !== 'THERAPIST') {
    return null;
  }

  return <>{children}</>;
}
