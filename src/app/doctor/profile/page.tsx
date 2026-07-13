'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DoctorProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name: </span>
            {user.firstName} {user.lastName}
          </p>
          <p>
            <span className="text-muted-foreground">Email: </span>
            {user.email}
          </p>
          <p>
            <span className="text-muted-foreground">Role: </span>
            Doctor
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
