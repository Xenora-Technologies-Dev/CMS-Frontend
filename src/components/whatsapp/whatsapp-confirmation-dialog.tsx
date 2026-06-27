'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, MessageCircle } from 'lucide-react';

interface WhatsAppConfirmationDialogProps {
  open: boolean;
  patientName: string;
  sending: boolean;
  onConfirm: () => void;
  onDecline: () => void;
}

export function WhatsAppConfirmationDialog({
  open,
  patientName,
  sending,
  onConfirm,
  onDecline,
}: WhatsAppConfirmationDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !sending) onDecline();
      }}
    >
      <DialogContent
        className={`sm:max-w-md${sending ? ' [&>button]:hidden' : ''}`}
        onPointerDownOutside={(event) => sending && event.preventDefault()}
        onEscapeKeyDown={(event) => sending && event.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
              ) : (
                <MessageCircle className="h-5 w-5 text-emerald-700" />
              )}
            </div>
            <div>
              <DialogTitle>
                {sending ? 'Sending WhatsApp message…' : 'Send WhatsApp confirmation?'}
              </DialogTitle>
              <DialogDescription>
                {sending
                  ? `Please wait while we notify ${patientName}. This may take a few seconds.`
                  : `Send an appointment update to ${patientName} via WhatsApp.`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {!sending && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onDecline}>
              No, skip
            </Button>
            <Button type="button" onClick={onConfirm}>
              Yes, send message
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
