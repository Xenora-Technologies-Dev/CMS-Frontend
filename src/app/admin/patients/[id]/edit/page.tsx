'use client';

import { PatientForm } from '@/components/patient/patient-form';
import { use } from 'react';

interface EditPatientPageProps {
  params: Promise<{ id: string }>;
}

export default function EditPatientPage({ params }: EditPatientPageProps) {
  const { id } = use(params);
  return <PatientForm mode="edit" patientId={id} />;
}
