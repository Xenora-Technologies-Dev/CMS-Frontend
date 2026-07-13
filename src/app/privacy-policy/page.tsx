import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_NAME } from '@/lib/version';

export const metadata: Metadata = {
  title: `Privacy Policy | ${APP_NAME}`,
  description:
    'Privacy Policy for CliniqFlow clinic management and WhatsApp appointment messaging.',
  robots: { index: true, follow: true },
};

const LAST_UPDATED = '13 July 2026';
const BUSINESS_NAME = 'CliniqFlow / Dar Al Majaz Clinic';
const CONTACT_EMAIL = 'privacy@daralmajaz.ae';
const SUPPORT_EMAIL = 'info@daralmajaz.ae';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/20">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-lg font-semibold tracking-tight text-slate-900">{APP_NAME}</p>
            <p className="text-xs text-muted-foreground">Clinic Therapy & Appointment Management</p>
          </div>
          <Link
            href="/login"
            className="text-sm font-medium text-blue-700 underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <article className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm sm:p-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

          <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-700">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">1. Introduction</h2>
              <p>
                This Privacy Policy explains how <strong>{BUSINESS_NAME}</strong> (“we”, “us”, or
                “our”) collects, uses, stores, and shares personal information when you use our
                clinic management platform <strong>{APP_NAME}</strong> and related services,
                including appointment notifications sent through the{' '}
                <strong>WhatsApp Business Platform</strong> (Meta Platforms, Inc.).
              </p>
              <p>
                By using our services, messaging our WhatsApp Business number, or providing your
                contact details for appointment communications, you acknowledge the practices
                described in this policy.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">2. Who we are</h2>
              <p>
                {APP_NAME} is a clinic therapy and appointment management system operated for{' '}
                <strong>Dar Al Majaz Clinic</strong> (United Arab Emirates). It is used by
                authorized clinic staff (administrators, therapists, and doctors) to manage
                patients, appointments, and related clinic operations.
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Privacy contact:{' '}
                  <a className="text-blue-700 underline-offset-2 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
                    {CONTACT_EMAIL}
                  </a>
                </li>
                <li>
                  General clinic contact:{' '}
                  <a className="text-blue-700 underline-offset-2 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
                    {SUPPORT_EMAIL}
                  </a>
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">3. Information we collect</h2>
              <p>Depending on how you interact with us, we may process:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Patient information:</strong> name, date of birth, gender, phone /
                  WhatsApp number, email (if provided), address, insurance details, and clinical
                  scheduling notes needed for care coordination.
                </li>
                <li>
                  <strong>Appointment information:</strong> service/therapy or consultation type,
                  date and time, room, assigned therapist or doctor, booking status, and related
                  messages.
                </li>
                <li>
                  <strong>Staff account information:</strong> name, work email or mobile login,
                  role, and activity needed to operate the clinic system securely.
                </li>
                <li>
                  <strong>WhatsApp messaging data:</strong> phone number used for WhatsApp,
                  message delivery status, and message content we send (for example appointment
                  confirmations, cancellations, reschedules, and appointment slip documents). If
                  you message our clinic WhatsApp number, we may process inbound message content
                  needed to respond to your request.
                </li>
                <li>
                  <strong>Technical logs:</strong> limited operational logs (such as timestamps,
                  delivery success/failure, and security-related events) to run and protect the
                  service.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">4. How we use your information</h2>
              <p>We use personal information to:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Schedule, manage, confirm, cancel, or reschedule clinic appointments</li>
                <li>
                  Send appointment-related notifications and documents via WhatsApp and, where
                  applicable, other clinic communication channels
                </li>
                <li>Respond to patient inquiries received on our WhatsApp Business number</li>
                <li>Operate clinic administration, reporting, and care coordination</li>
                <li>Maintain security, prevent abuse, and meet legal or regulatory obligations</li>
                <li>Improve reliability of our messaging and clinic management services</li>
              </ul>
              <p>
                We do <strong>not</strong> sell personal information. We do not use WhatsApp
                patient conversations for unrelated advertising.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">
                5. WhatsApp Business messaging (Meta)
              </h2>
              <p>
                We use the <strong>WhatsApp Business Platform / Cloud API</strong> provided by Meta
                to deliver appointment-related messages to patients who have provided a mobile
                number for WhatsApp contact, and to receive messages sent to our clinic WhatsApp
                Business number.
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Message content may include appointment details (patient name, service, date/time,
                  location/clinic reference) and documents such as appointment slips.
                </li>
                <li>
                  To deliver messages, necessary data (such as phone number and message content) is
                  transmitted to <strong>Meta Platforms, Inc.</strong> and processed under Meta’s
                  terms and policies for WhatsApp Business.
                </li>
                <li>
                  Meta’s processing of WhatsApp data is also governed by Meta’s Privacy Policy and
                  WhatsApp Business terms available on Meta’s websites.
                </li>
                <li>
                  You may opt out of WhatsApp appointment notifications by asking clinic staff to
                  update your contact preferences, or by following any stop/opt-out instructions
                  provided in messages where applicable. Standard messaging rates from your carrier
                  may apply.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">6. Legal bases / purposes</h2>
              <p>We process personal data where needed to:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Provide healthcare administration and appointment services you request</li>
                <li>Communicate with you about bookings and clinic services</li>
                <li>Comply with applicable UAE laws and professional obligations</li>
                <li>Protect the security and integrity of our systems and users</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">7. Sharing of information</h2>
              <p>We may share information only with:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Service providers</strong> that host or operate our platform (for
                  example cloud hosting and database providers) under contractual confidentiality
                  and security obligations
                </li>
                <li>
                  <strong>Meta / WhatsApp</strong>, as required to send or receive WhatsApp
                  Business messages
                </li>
                <li>
                  <strong>Authorities or insurers</strong>, when required by law or legitimate
                  clinic operations (for example insurance verification)
                </li>
              </ul>
              <p>We do not share patient WhatsApp data with third parties for their own marketing.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">8. Data retention</h2>
              <p>
                We retain personal information for as long as needed to provide clinic services,
                maintain medical/administrative records, resolve disputes, and meet legal,
                accounting, or regulatory requirements. Messaging logs used for delivery
                troubleshooting may be retained for a limited operational period.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">9. Security</h2>
              <p>
                We apply administrative and technical safeguards appropriate to a clinic
                management system, including access controls for staff accounts, encrypted
                transport (HTTPS), and server-side handling of WhatsApp API credentials. No method
                of transmission or storage is 100% secure; we work to protect data against
                unauthorized access, alteration, or disclosure.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">10. Your rights and choices</h2>
              <p>Subject to applicable law, you may request to:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Access the personal information we hold about you</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion where legally permitted</li>
                <li>Withdraw consent for WhatsApp notifications (clinic communications may still
                  occur through other channels when necessary for care)</li>
              </ul>
              <p>
                To exercise these rights, contact{' '}
                <a className="text-blue-700 underline-offset-2 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
                  {CONTACT_EMAIL}
                </a>
                . We may need to verify your identity before fulfilling a request.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">11. Children’s privacy</h2>
              <p>
                Our services are used in a clinical context and may include information about
                minors when provided by a parent or guardian for appointment and care purposes. We
                do not knowingly use children’s data for marketing.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">12. International transfers</h2>
              <p>
                Our service providers and Meta/WhatsApp may process data on servers located outside
                the UAE. Where this occurs, we rely on appropriate safeguards and provider
                commitments consistent with the service being provided.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">13. Changes to this policy</h2>
              <p>
                We may update this Privacy Policy from time to time. The “Last updated” date at the
                top will change when we do. Continued use of our services after an update means you
                acknowledge the revised policy.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">14. Contact us</h2>
              <p>
                For privacy questions, WhatsApp messaging concerns, or data requests related to{' '}
                {APP_NAME} / Dar Al Majaz Clinic:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Email:{' '}
                  <a className="text-blue-700 underline-offset-2 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
                    {CONTACT_EMAIL}
                  </a>
                </li>
                <li>
                  Clinic:{' '}
                  <a className="text-blue-700 underline-offset-2 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
                    {SUPPORT_EMAIL}
                  </a>
                </li>
              </ul>
            </section>
          </div>
        </article>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          This page is provided for transparency and for WhatsApp / Meta business verification
          requirements.
        </p>
      </main>
    </div>
  );
}
