'use client';

import { TherapyForm } from '@/components/therapy/therapy-form';
import { use } from 'react';

interface EditTherapyPageProps {
  params: Promise<{ id: string }>;
}

export default function EditTherapyPage({ params }: EditTherapyPageProps) {
  const { id } = use(params);
  return <TherapyForm mode="edit" therapyId={id} />;
}
