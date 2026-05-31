'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { isAuthenticated } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user && !isAuthenticated()) {
      router.replace('/login');
      return;
    }
    if (user?.role === 'THERAPIST') {
      router.replace('/therapist');
    } else {
      router.replace('/admin');
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Redirecting…
    </div>
  );
}
