import { UserList } from '@/components/user/user-list';

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          Manage clinic staff accounts, roles, and access control.
        </p>
      </div>
      <UserList />
    </div>
  );
}
