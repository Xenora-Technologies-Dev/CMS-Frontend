import { AdminPagePlaceholder } from '@/components/layout/admin-page-placeholder';
import { UsersRound } from 'lucide-react';

export default function UsersPage() {
  return (
    <AdminPagePlaceholder
      title="Users"
      description="Clinic staff accounts, roles, and access control."
      icon={UsersRound}
    />
  );
}
