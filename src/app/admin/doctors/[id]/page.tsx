'use client';

import { DoctorProfileView } from '@/components/doctor/doctor-profile';
import { use } from 'react';

interface DoctorProfilePageProps {
  params: Promise<{ id: string }>;
}

export default function DoctorProfilePage({ params }: DoctorProfilePageProps) {
  const { id } = use(params);
  return <DoctorProfileView doctorId={id} />;
}
