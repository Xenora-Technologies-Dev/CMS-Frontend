'use client';

import { useClinic } from '@/components/providers/clinic-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateCurrentClinic } from '@/lib/clinic-api';
import { Building2, Loader2, MapPin, Phone, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ClinicSettingsPage() {
  const { clinic, loading, setClinic, refreshClinic } = useClinic();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [emirate, setEmirate] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!clinic) return;
    setName(clinic.name ?? '');
    setAddress(clinic.address ?? '');
    setCity(clinic.city ?? '');
    setEmirate(clinic.emirate ?? '');
    setPhone(clinic.phone ?? '');
    setEmail(clinic.email ?? '');
  }, [clinic]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const result = await updateCurrentClinic({
        name: name.trim() || undefined,
        address: address.trim() || null,
        city: city.trim() || null,
        emirate: emirate.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
      });
      setClinic(result.clinic);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save clinic details');
    } finally {
      setSaving(false);
    }
  }

  if (loading && !clinic) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading clinic details…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Clinic Settings</CardTitle>
              <CardDescription>
                Optional clinic details shown on appointment slips and lists
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="clinic-name">Clinic Name</Label>
              <Input
                id="clinic-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sunrise Therapy Center"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinic-address">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="clinic-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street address"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clinic-city">City</Label>
                <Input
                  id="clinic-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinic-emirate">Emirate / Region</Label>
                <Input
                  id="clinic-emirate"
                  value={emirate}
                  onChange={(e) => setEmirate(e.target.value)}
                  placeholder="Emirate or region"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clinic-phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="clinic-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+971 50 000 0000"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinic-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="clinic-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@clinic.com"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              All fields are optional. Saved details appear on appointment slips, PDFs, and
              appointment views.
            </p>

            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Clinic details saved successfully.
              </p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
              <Button type="button" variant="outline" disabled={saving} onClick={() => void refreshClinic()}>
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
