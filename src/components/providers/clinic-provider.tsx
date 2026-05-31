'use client';

import { getCurrentClinic, type Clinic } from '@/lib/clinic-api';
import { useAuth } from '@/components/auth/auth-provider';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface ClinicContextValue {
  clinic: Clinic | null;
  loading: boolean;
  refreshClinic: () => Promise<void>;
  setClinic: (clinic: Clinic) => void;
}

const ClinicContext = createContext<ClinicContextValue | null>(null);

export function ClinicProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshClinic = useCallback(async () => {
    if (!user) {
      setClinic(null);
      return;
    }
    setLoading(true);
    try {
      const result = await getCurrentClinic();
      setClinic(result.clinic);
    } catch {
      setClinic(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshClinic();
  }, [refreshClinic]);

  const value = useMemo(
    () => ({ clinic, loading, refreshClinic, setClinic }),
    [clinic, loading, refreshClinic],
  );

  return <ClinicContext.Provider value={value}>{children}</ClinicContext.Provider>;
}

export function useClinic() {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error('useClinic must be used within ClinicProvider');
  }
  return context;
}

export function useClinicOptional() {
  return useContext(ClinicContext);
}
