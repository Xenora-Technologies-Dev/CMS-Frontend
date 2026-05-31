import { TherapistShell } from '@/components/layout/therapist-shell';

export default function TherapistLayout({ children }: { children: React.ReactNode }) {
  return <TherapistShell>{children}</TherapistShell>;
}
