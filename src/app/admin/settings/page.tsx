'use client';



import { useClinic } from '@/components/providers/clinic-provider';

import { AppVersion } from '@/components/shared/app-version';

import { Button } from '@/components/ui/button';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Input } from '@/components/ui/input';

import { Label } from '@/components/ui/label';

import {
  getWhatsAppAutoReplyTemplate,
  isAllowBookingOutsideConsultationHoursEnabled,
  isAutoDownloadSlipsEnabled,
  isWhatsAppAutoReplyEnabled,
  isWhatsAppConfirmationPromptEnabled,
  isWhatsAppMessagingEnabled,
  updateCurrentClinic,
} from '@/lib/clinic-api';

import { Building2, CalendarClock, Download, Loader2, MapPin, MessageCircle, Phone, Mail } from 'lucide-react';

import { useEffect, useState } from 'react';



export default function ClinicSettingsPage() {

  const { clinic, loading, setClinic, refreshClinic } = useClinic();

  const [name, setName] = useState('');

  const [address, setAddress] = useState('');

  const [city, setCity] = useState('');

  const [emirate, setEmirate] = useState('');

  const [phone, setPhone] = useState('');

  const [email, setEmail] = useState('');

  const [autoDownloadSlips, setAutoDownloadSlips] = useState(true);

  const [allowBookingOutsideConsultationHours, setAllowBookingOutsideConsultationHours] =
    useState(false);

  const [whatsappAppointmentMessaging, setWhatsappAppointmentMessaging] = useState(true);
  const [whatsappConfirmationPrompt, setWhatsappConfirmationPrompt] = useState(true);
  const [whatsappAutoReplyEnabled, setWhatsappAutoReplyEnabled] = useState(false);
  const [whatsappAutoReplyTemplate, setWhatsappAutoReplyTemplate] = useState('');

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

    setAutoDownloadSlips(isAutoDownloadSlipsEnabled(clinic));

    setAllowBookingOutsideConsultationHours(
      isAllowBookingOutsideConsultationHoursEnabled(clinic),
    );
    setWhatsappAppointmentMessaging(isWhatsAppMessagingEnabled(clinic));
    setWhatsappConfirmationPrompt(isWhatsAppConfirmationPromptEnabled(clinic));
    setWhatsappAutoReplyEnabled(isWhatsAppAutoReplyEnabled(clinic));
    setWhatsappAutoReplyTemplate(getWhatsAppAutoReplyTemplate(clinic));

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

        settings: {
          autoDownloadSlips,
          allowBookingOutsideConsultationHours,
          whatsappAppointmentMessaging,
          whatsappConfirmationPrompt: whatsappAppointmentMessaging
            ? whatsappConfirmationPrompt
            : false,
          whatsappAutoReplyEnabled:
            whatsappAppointmentMessaging && whatsappAutoReplyEnabled,
          whatsappAutoReplyTemplate:
            whatsappAppointmentMessaging && whatsappAutoReplyEnabled
              ? whatsappAutoReplyTemplate.trim() || null
              : null,
        },

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

    <div className="mx-auto max-w-2xl space-y-6">

      <form onSubmit={handleSubmit} className="space-y-6">

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

          <CardContent className="space-y-5">

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

          </CardContent>

        </Card>



        <Card>

          <CardHeader>

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">

                <Download className="h-5 w-5 text-primary" />

              </div>

              <div>

                <CardTitle>Appointment Slips</CardTitle>

                <CardDescription>Control automatic slip download after new bookings</CardDescription>

              </div>

            </div>

          </CardHeader>

          <CardContent>

            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border px-4 py-3">

              <div>

                <p className="font-medium text-slate-900">Auto-download appointment slips</p>

                <p className="mt-1 text-sm text-muted-foreground">

                  When enabled, a PDF slip downloads automatically after each successful booking.

                  You can still view or download slips manually from the success notification.

                </p>

              </div>

              <button

                type="button"

                role="switch"

                aria-checked={autoDownloadSlips}

                aria-label="Auto-download appointment slips"

                onClick={() => setAutoDownloadSlips((prev) => !prev)}

                className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${

                  autoDownloadSlips ? 'bg-primary' : 'bg-slate-200'

                }`}

              >

                <span

                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${

                    autoDownloadSlips ? 'translate-x-5' : 'translate-x-0.5'

                  }`}

                />

              </button>

            </label>

          </CardContent>

        </Card>



        <Card>

          <CardHeader>

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">

                <MessageCircle className="h-5 w-5 text-primary" />

              </div>

              <div>

                <CardTitle>WhatsApp Messaging</CardTitle>

                <CardDescription>

                  Send appointment confirmations, cancellations, and reschedule updates via WhatsApp

                </CardDescription>

              </div>

            </div>

          </CardHeader>

          <CardContent className="space-y-3">

            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border px-4 py-3">

              <div>

                <p className="font-medium text-slate-900">WhatsApp appointment messaging</p>

                <p className="mt-1 text-sm text-muted-foreground">

                  When enabled, staff can send WhatsApp updates after booking, cancelling, or

                  postponing appointments. Requires server-side WhatsApp API credentials.

                </p>

              </div>

              <button

                type="button"

                role="switch"

                aria-checked={whatsappAppointmentMessaging}

                aria-label="WhatsApp appointment messaging"

                onClick={() => {
                  setWhatsappAppointmentMessaging((prev) => {
                    const next = !prev;
                    if (!next) {
                      setWhatsappAutoReplyEnabled(false);
                    }
                    return next;
                  });
                }}

                className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${

                  whatsappAppointmentMessaging ? 'bg-primary' : 'bg-slate-200'

                }`}

              >

                <span

                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${

                    whatsappAppointmentMessaging ? 'translate-x-5' : 'translate-x-0.5'

                  }`}

                />

              </button>

            </label>



            <label

              className={`flex items-start justify-between gap-4 rounded-lg border px-4 py-3 ${

                whatsappAppointmentMessaging ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'

              }`}

            >

              <div>

                <p className="font-medium text-slate-900">WhatsApp confirmation prompt</p>

                <p className="mt-1 text-sm text-muted-foreground">

                  When enabled, staff are asked before each WhatsApp message is sent. When

                  disabled, messages are sent automatically and the result is shown after the

                  action.

                </p>

              </div>

              <button

                type="button"

                role="switch"

                aria-checked={whatsappConfirmationPrompt}

                aria-label="WhatsApp confirmation prompt"

                disabled={!whatsappAppointmentMessaging}

                onClick={() => setWhatsappConfirmationPrompt((prev) => !prev)}

                className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${

                  whatsappAppointmentMessaging && whatsappConfirmationPrompt

                    ? 'bg-primary'

                    : 'bg-slate-200'

                }`}

              >

                <span

                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${

                    whatsappAppointmentMessaging && whatsappConfirmationPrompt

                      ? 'translate-x-5'

                      : 'translate-x-0.5'

                  }`}

                />

              </button>

            </label>



            <label
              className={`flex items-start justify-between gap-4 rounded-lg border px-4 py-3 ${
                whatsappAppointmentMessaging ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
              }`}
            >
              <div>
                <p className="font-medium text-slate-900">Automatic reply to patient messages</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  When a patient messages your clinic WhatsApp number, send an approved Utility
                  template automatically. Use a text-only template, or one with{' '}
                  <code className="rounded bg-slate-100 px-1">{'{{1}}'}</code> for the patient name.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={whatsappAutoReplyEnabled}
                aria-label="WhatsApp automatic reply"
                disabled={!whatsappAppointmentMessaging}
                onClick={() => setWhatsappAutoReplyEnabled((prev) => !prev)}
                className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
                  whatsappAppointmentMessaging && whatsappAutoReplyEnabled
                    ? 'bg-primary'
                    : 'bg-slate-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    whatsappAppointmentMessaging && whatsappAutoReplyEnabled
                      ? 'translate-x-5'
                      : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>



            <div
              className={`space-y-2 rounded-lg border px-4 py-3 ${
                whatsappAppointmentMessaging && whatsappAutoReplyEnabled ? '' : 'opacity-60'
              }`}
            >
              <Label htmlFor="whatsappAutoReplyTemplate">Auto-reply template name</Label>
              <Input
                id="whatsappAutoReplyTemplate"
                value={whatsappAutoReplyTemplate}
                onChange={(e) => setWhatsappAutoReplyTemplate(e.target.value)}
                disabled={!whatsappAppointmentMessaging || !whatsappAutoReplyEnabled}
                placeholder="e.g. clinic_welcome_reply"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Exact approved template name from WhatsApp Manager. Language uses{' '}
                <code className="rounded bg-slate-100 px-1">WHATSAPP_TEMPLATE_LANGUAGE</code> on
                the server.
              </p>
            </div>

          </CardContent>

        </Card>



        <Card>

          <CardHeader>

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">

                <CalendarClock className="h-5 w-5 text-primary" />

              </div>

              <div>

                <CardTitle>Booking Preferences</CardTitle>

                <CardDescription>Control therapy booking schedule constraints</CardDescription>

              </div>

            </div>

          </CardHeader>

          <CardContent>

            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border px-4 py-3">

              <div>

                <p className="font-medium text-slate-900">Booking outside consultation hours</p>

                <p className="mt-1 text-sm text-muted-foreground">

                  When enabled, therapy bookings can be scheduled outside therapist consultation

                  hours. Therapist and room conflicts still apply.

                </p>

              </div>

              <button

                type="button"

                role="switch"

                aria-checked={allowBookingOutsideConsultationHours}

                aria-label="Allow booking outside consultation hours"

                onClick={() => setAllowBookingOutsideConsultationHours((prev) => !prev)}

                className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${

                  allowBookingOutsideConsultationHours ? 'bg-primary' : 'bg-slate-200'

                }`}

              >

                <span

                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${

                    allowBookingOutsideConsultationHours ? 'translate-x-5' : 'translate-x-0.5'

                  }`}

                />

              </button>

            </label>

          </CardContent>

        </Card>



        {error && (

          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">

            {error}

          </p>

        )}

        {success && (

          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">

            Settings saved successfully.

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



      <div className="flex items-center justify-between px-1 text-muted-foreground">

        <AppVersion showName />

        <p className="text-[11px]">Clinic Therapy & Appointment Management</p>

      </div>

    </div>

  );

}


