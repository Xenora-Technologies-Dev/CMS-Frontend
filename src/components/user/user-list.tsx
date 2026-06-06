'use client';

import { ActiveStatusBadge } from '@/components/shared/active-status-badge';
import { ListToolbar, statusFilterToIsActive, type StatusFilter } from '@/components/shared/list-toolbar';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { CreateAdminDialog } from '@/components/user/create-admin-dialog';
import { EditAdminDialog } from '@/components/user/edit-admin-dialog';
import { UserViewDialog } from '@/components/user/user-view-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getFeaturesForRole } from '@/lib/permissions';
import { listUsers, setUserStatus } from '@/lib/user-api';
import type { PaginatedMeta, UserListItem, UserRole } from '@/lib/types';
import { Plus, Shield, UserCog, Eye, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

const DEFAULT_META: PaginatedMeta = { page: 1, limit: 20, total: 0, totalPages: 0 };

function RoleBadge({ role }: { role: UserRole }) {
  if (role === 'ADMIN') {
    return (
      <Badge variant="default" className="gap-1">
        <Shield className="h-3 w-3" />
        Admin
      </Badge>
    );
  }
  if (role === 'DOCTOR') {
    return (
      <Badge variant="secondary" className="gap-1 bg-violet-100 text-violet-800">
        <UserCog className="h-3 w-3" />
        Doctor
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <UserCog className="h-3 w-3" />
      Therapist
    </Badge>
  );
}

export function UserList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta>(DEFAULT_META);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewUser, setViewUser] = useState<UserListItem | null>(null);
  const [editUser, setEditUser] = useState<UserListItem | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listUsers({
        page,
        limit,
        search: debouncedSearch,
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        isActive: statusFilterToIsActive(statusFilter),
      });
      setUsers(result.data);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter, roleFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, roleFilter]);

  async function handleToggleStatus(user: UserListItem) {
    const next = !user.isActive;
    const label = next ? 'enable' : 'disable';
    if (!confirm(`${label.charAt(0).toUpperCase()}${label.slice(1)} ${user.firstName} ${user.lastName}?`)) {
      return;
    }
    setActionId(user.id);
    try {
      await setUserStatus(user.id, next);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${label} user`);
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name or email…"
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Admin
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={roleFilter}
          onValueChange={(v) => setRoleFilter(v as 'ALL' | UserRole)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All roles</SelectItem>
            <SelectItem value="ADMIN">Admin only</SelectItem>
            <SelectItem value="THERAPIST">Therapist only</SelectItem>
            <SelectItem value="DOCTOR">Doctor only</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Role permissions are centrally configured — Admin has all {getFeaturesForRole('ADMIN').length}{' '}
          features enabled.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {error && <p className="border-b p-4 text-sm text-destructive">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Last login</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      Loading users…
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        {user.phone && (
                          <p className="text-xs text-muted-foreground md:hidden">{user.phone}</p>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-4 py-3">
                        <ActiveStatusBadge isActive={user.isActive} />
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })
                          : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewUser(user)}
                          >
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            View
                          </Button>
                          {user.role === 'ADMIN' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditUser(user)}
                            >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />
                              Edit
                            </Button>
                          ) : user.therapistId ? (
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/admin/therapists/${user.therapistId}/edit`}>
                                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                Edit
                              </Link>
                            </Button>
                          ) : null}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionId === user.id}
                            onClick={() => void handleToggleStatus(user)}
                          >
                            {actionId === user.id
                              ? 'Saving…'
                              : user.isActive
                                ? 'Disable'
                                : 'Enable'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <PaginationControls
        meta={{ ...meta, page, limit }}
        onPageChange={setPage}
        onLimitChange={(value) => {
          setLimit(value);
          setPage(1);
        }}
      />

      <CreateAdminDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => void load()} />
      <UserViewDialog
        user={viewUser}
        open={!!viewUser}
        onOpenChange={(open) => {
          if (!open) setViewUser(null);
        }}
      />
      <EditAdminDialog
        user={editUser}
        open={!!editUser}
        onOpenChange={(open) => {
          if (!open) setEditUser(null);
        }}
        onSaved={() => void load()}
      />
    </div>
  );
}
