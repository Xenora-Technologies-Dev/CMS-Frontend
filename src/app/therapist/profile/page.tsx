'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, User } from 'lucide-react';

export default function TherapistProfilePage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Name: </span>
            <span className="font-medium">
              {user?.firstName} {user?.lastName}
            </span>
          </p>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            {user?.email}
          </div>
          <p>
            <span className="text-muted-foreground">Role: </span>
            Therapist
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
