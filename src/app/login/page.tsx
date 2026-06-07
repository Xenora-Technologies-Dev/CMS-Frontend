'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { PasswordInput } from '@/components/shared/password-input';
import { login } from '@/lib/booking-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppVersion } from '@/components/shared/app-version';
import { Stethoscope } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await login({ identifier: identifier.trim(), password });
      signIn(result.accessToken, result.user);
      if (result.user.role === 'ADMIN') {
        router.push('/admin');
      } else if (result.user.role === 'THERAPIST') {
        router.push('/therapist');
      } else if (result.user.role === 'DOCTOR') {
        router.push('/doctor');
      } else {
        setError('Unsupported account role');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-blue-50/40 to-teal-50/30">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-teal-200/30 blur-3xl" />
      </div>

      <div className="relative flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-xl shadow-blue-900/5 backdrop-blur-sm">
            <div className="bg-gradient-to-r from-blue-700 to-teal-600 px-8 py-10 text-center text-white">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-sm">
                <Stethoscope className="h-8 w-8" strokeWidth={1.75} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">CliniqFlow</h1>
              <p className="mt-1.5 text-sm text-blue-100">Clinic Therapy & Appointment Management</p>
              <p className="mt-2 text-xs text-blue-200/80">Version 1.5</p>
            </div>

            <div className="px-8 py-8">
              <div className="mb-6 text-center">
                <h2 className="text-lg font-semibold text-slate-900">Welcome back</h2>
                <p className="mt-1 text-sm text-muted-foreground">Sign in as admin, therapist, or doctor</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="identifier">Email or mobile number</Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="you@clinic.com or 05XXXXXXXX"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="h-11"
                    autoComplete="username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11"
                    autoComplete="current-password"
                    required
                  />
                </div>
                {error && (
                  <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <footer className="relative space-y-1 py-6 text-center">
        <AppVersion />
        <p className="text-xs text-muted-foreground">
          Design and Developed by{' '}
          <span className="font-semibold tracking-wide text-slate-700">XENORA</span>
        </p>
      </footer>
    </div>
  );
}
