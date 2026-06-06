'use client';

import { DoctorForm } from '@/components/doctor/doctor-form';
import { use } from 'react';

interface EditDoctorPageProps {
  params: Promise<{ id: string }>;
}

export default function EditDoctorPage({ params }: EditDoctorPageProps) {
  const { id } = use(params);
  return <DoctorForm mode="edit" doctorId={id} />;
}
