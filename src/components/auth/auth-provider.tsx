'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getMe } from '@/lib/booking-api';
import { clearAuth, getStoredUser, isAuthenticated, setAuth } from '@/lib/auth';
import type { AuthUser } from '@/lib/types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function bootstrap() {
      if (!isAuthenticated()) {
        setLoading(false);
        return;
      }

      const cached = getStoredUser<AuthUser>();
      if (cached) setUser(cached);

      try {
        const { user: freshUser } = await getMe();
        setUser(freshUser);
        const token = localStorage.getItem('clinic_access_token');
        if (token) setAuth(token, freshUser);
      } catch {
        clearAuth();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, []);

  function signIn(token: string, nextUser: AuthUser) {
    setAuth(token, nextUser);
    setUser(nextUser);
    setLoading(false);
  }

  function logout() {
    clearAuth();
    setUser(null);
    router.push('/login');
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
