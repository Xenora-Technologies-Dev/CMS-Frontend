'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';
import Link from 'next/link';

export default function DoctorHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome</h1>
        <p className="text-sm text-muted-foreground">
          View your consultation schedule and manage your appointments.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-violet-600" />
            My Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Open your consultation calendar to see today&apos;s bookings.
          </p>
          <Button asChild>
            <Link href="/doctor/calendar">Go to calendar</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
