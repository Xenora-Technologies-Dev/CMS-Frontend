'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPatient } from '@/lib/patient-api';
import type { Patient } from '@/lib/types';
import { isValidUaeMobile } from '@/lib/uae-phone';
import { useState } from 'react';

interface QuickAddPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (patient: Patient) => void;
}

export function QuickAddPatientDialog({ open, onOpenChange, onCreated }: QuickAddPatientDialogProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [phoneSameAsWhatsapp, setPhoneSameAsWhatsapp] = useState(true);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setFirstName('');
    setLastName('');
    setPhone('');
    setWhatsappNumber('');
    setPhoneSameAsWhatsapp(true);
    setEmail('');
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError('First name, last name, and mobile are required');
      return;
    }
    if (!isValidUaeMobile(phone.trim())) {
      setError('Mobile must be a valid UAE number (05XXXXXXXX)');
      return;
    }
    if (!phoneSameAsWhatsapp) {
      if (!whatsappNumber.trim()) {
        setError('WhatsApp number is required when it differs from mobile');
        return;
      }
      if (!isValidUaeMobile(whatsappNumber.trim())) {
        setError('WhatsApp number must be a valid UAE number (05XXXXXXXX)');
        return;
      }
    }

    setLoading(true);
    try {
      const { patient } = await createPatient({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        whatsappNumber: phoneSameAsWhatsapp ? null : whatsappNumber.trim(),
        email: email.trim() || undefined,
      });
      onCreated({
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        medicalRecordNo: patient.medicalRecordNo,
        phone: patient.phone,
        whatsappNumber: patient.whatsappNumber,
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create patient');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Add Patient</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quick-first-name">First name *</Label>
              <Input
                id="quick-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-last-name">Last name *</Label>
              <Input
                id="quick-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-phone">Mobile *</Label>
            <Input
              id="quick-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05XXXXXXXX"
              required
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={phoneSameAsWhatsapp}
              onChange={(e) => setPhoneSameAsWhatsapp(e.target.checked)}
            />
            Phone and WhatsApp number are the same
          </label>
          {!phoneSameAsWhatsapp && (
            <div className="space-y-2">
              <Label htmlFor="quick-whatsapp">WhatsApp number *</Label>
              <Input
                id="quick-whatsapp"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="05XXXXXXXX"
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="quick-email">Email</Label>
            <Input
              id="quick-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Save Patient'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
