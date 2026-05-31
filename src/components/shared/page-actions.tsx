import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface PageActionsProps {
  backHref?: string;
  backLabel?: string;
  title?: string;
  children?: ReactNode;
}

export function PageActions({ backHref, backLabel = 'Back', title, children }: PageActionsProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        {backHref && (
          <Button variant="ghost" size="sm" className="-ml-2 h-8" asChild>
            <Link href={backHref}>{backLabel}</Link>
          </Button>
        )}
        {title && <h2 className="text-lg font-semibold">{title}</h2>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
