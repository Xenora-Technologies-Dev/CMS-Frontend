'use client';

import { PatientInsuranceForm } from '@/components/patient/patient-insurance-form';
import { PageActions } from '@/components/shared/page-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createPatient, getPatient, updatePatient } from '@/lib/patient-api';
import type { PatientProfile } from '@/lib/types';
import { toDateInputValue } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface PatientFormProps {
  mode: 'create' | 'edit';
  patientId?: string;
}

const emptyForm = {
  firstName: '',
  lastName: '',
  medicalRecordNo: '',
  dateOfBirth: '',
  gender: '',
  email: '',
  phone: '',
  whatsappNumber: '',
  phoneSameAsWhatsapp: true,
  alternatePhone: '',
  nationality: '',
  emiratesId: '',
  address: '',
  city: '',
  emirate: '',
  notes: '',
  isActive: true,
};

export function PatientForm({ mode, patientId }: PatientFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPatient = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const { patient: data } = await getPatient(patientId);
      setPatient(data);
      setForm({
        firstName: data.firstName,
        lastName: data.lastName,
        medicalRecordNo: data.medicalRecordNo,
        dateOfBirth: toDateInputValue(data.dateOfBirth),
        gender: data.gender ?? '',
        email: data.email ?? '',
        phone: data.phone ?? '',
        whatsappNumber: data.whatsappNumber ?? '',
        phoneSameAsWhatsapp: !data.whatsappNumber,
        alternatePhone: data.alternatePhone ?? '',
        nationality: data.nationality ?? '',
        emiratesId: data.emiratesId ?? '',
        address: data.address ?? '',
        city: data.city ?? '',
        emirate: data.emirate ?? '',
        notes: data.notes ?? '',
        isActive: data.isActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patient');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (mode === 'edit') void loadPatient();
  }, [mode, loadPatient]);

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      medicalRecordNo: form.medicalRecordNo.trim() || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      gender: form.gender.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      whatsappNumber:
        mode === 'create'
          ? form.phoneSameAsWhatsapp
            ? null
            : form.whatsappNumber.trim() || undefined
          : form.whatsappNumber.trim() || undefined,
      alternatePhone: form.alternatePhone.trim() || undefined,
      nationality: form.nationality.trim() || undefined,
      emiratesId: form.emiratesId.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      emirate: form.emirate.trim() || undefined,
      notes: form.notes.trim() || undefined,
      ...(mode === 'edit' && { isActive: form.isActive }),
    };

    try {
      if (mode === 'create') {
        const { patient: created } = await createPatient(payload);
        router.push(`/admin/patients/${created.id}`);
      } else if (patientId) {
        await updatePatient(patientId, payload);
        router.push(`/admin/patients/${patientId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save patient');
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading patient…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageActions
        backHref={mode === 'edit' && patientId ? `/admin/patients/${patientId}` : '/admin/patients'}
        backLabel="← Back"
        title={mode === 'create' ? 'Add Patient' : 'Edit Patient'}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name *</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name *</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medicalRecordNo">Medical record no.</Label>
              <Input
                id="medicalRecordNo"
                value={form.medicalRecordNo}
                onChange={(e) => updateField('medicalRecordNo', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => updateField('dateOfBirth', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Input
                id="gender"
                value={form.gender}
                onChange={(e) => updateField('gender', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input
                id="nationality"
                value={form.nationality}
                onChange={(e) => updateField('nationality', e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="emiratesId">Emirates ID</Label>
              <Input
                id="emiratesId"
                value={form.emiratesId}
                onChange={(e) => updateField('emiratesId', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />
            </div>
            {mode === 'create' ? (
              <>
                <label className="flex cursor-pointer items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={form.phoneSameAsWhatsapp}
                    onChange={(e) => updateField('phoneSameAsWhatsapp', e.target.checked)}
                  />
                  Phone and WhatsApp number are the same
                </label>
                {!form.phoneSameAsWhatsapp && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="whatsappNumber">WhatsApp number</Label>
                    <Input
                      id="whatsappNumber"
                      value={form.whatsappNumber}
                      onChange={(e) => updateField('whatsappNumber', e.target.value)}
                      placeholder="05XXXXXXXX"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="whatsappNumber">WhatsApp number</Label>
                <Input
                  id="whatsappNumber"
                  value={form.whatsappNumber}
                  onChange={(e) => updateField('whatsappNumber', e.target.value)}
                  placeholder="Leave blank if same as phone"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="alternatePhone">Alternate phone</Label>
              <Input
                id="alternatePhone"
                value={form.alternatePhone}
                onChange={(e) => updateField('alternatePhone', e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(e) => updateField('city', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emirate">Emirate</Label>
              <Input
                id="emirate"
                value={form.emirate}
                onChange={(e) => updateField('emirate', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes & status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={4}
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
              />
            </div>
            {mode === 'edit' && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.isActive ? 'active' : 'inactive'}
                  onValueChange={(v) => updateField('isActive', v === 'active')}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {mode === 'edit' && patientId && patient && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Insurance policies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {patient.insurances.length > 0 && (
                <ul className="space-y-2 text-sm">
                  {patient.insurances.map((ins) => (
                    <li key={ins.id} className="rounded-md border px-3 py-2">
                      {ins.insuranceProvider.name} — {ins.policyNumber}
                    </li>
                  ))}
                </ul>
              )}
              <PatientInsuranceForm
                patientId={patientId}
                existing={patient.insurances}
                onAdded={() => void loadPatient()}
              />
            </CardContent>
          </Card>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : mode === 'create' ? 'Create patient' : 'Save changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              router.push(
                mode === 'edit' && patientId ? `/admin/patients/${patientId}` : '/admin/patients',
              )
            }
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
