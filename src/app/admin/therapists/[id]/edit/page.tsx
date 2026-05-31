'use client';

import { TherapistForm } from '@/components/therapist/therapist-form';
import { use } from 'react';

interface EditTherapistPageProps {
  params: Promise<{ id: string }>;
}

export default function EditTherapistPage({ params }: EditTherapistPageProps) {
  const { id } = use(params);
  return <TherapistForm mode="edit" therapistId={id} />;
}
