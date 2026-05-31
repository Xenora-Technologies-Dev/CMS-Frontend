import { AdminPagePlaceholder } from '@/components/layout/admin-page-placeholder';
import { Shield } from 'lucide-react';

export default function InsurancePage() {
  return (
    <AdminPagePlaceholder
      title="Insurance"
      description="Insurance providers, authorizations, and patient coverage."
      icon={Shield}
    />
  );
}
