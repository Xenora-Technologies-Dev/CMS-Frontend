import { PatientProfileView } from '@/components/patient/patient-profile';

interface PatientProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientProfilePage({ params }: PatientProfilePageProps) {
  const { id } = await params;
  return <PatientProfileView patientId={id} />;
}
