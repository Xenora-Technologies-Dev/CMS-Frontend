'use client';

import { TherapistProfileView } from '@/components/therapist/therapist-profile';
import { use } from 'react';

interface TherapistProfilePageProps {
  params: Promise<{ id: string }>;
}

export default function TherapistProfilePage({ params }: TherapistProfilePageProps) {
  const { id } = use(params);
  return <TherapistProfileView therapistId={id} />;
}
