'use client';

import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProgressDialogProps {
  open: boolean;
  title: string;
  description?: string;
}

/** Non-dismissible modal shown while a backend action is in progress. */
export function ProgressDialog({ open, title, description }: ProgressDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-sm gap-0 border-none shadow-xl sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-6">
          <Loader2 className="h-11 w-11 animate-spin text-primary" aria-hidden />
          <div className="space-y-1 text-center">
            <p className="text-base font-semibold text-foreground">{title}</p>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
