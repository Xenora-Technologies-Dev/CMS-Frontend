import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface AdminPagePlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export function AdminPagePlaceholder({ title, description, icon: Icon }: AdminPagePlaceholderProps) {
  return (
    <Card className="border-dashed shadow-sm">
      <CardHeader>
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This section is wired into the admin navigation. Connect your API and forms here to complete
          the workflow.
        </p>
      </CardContent>
    </Card>
  );
}
