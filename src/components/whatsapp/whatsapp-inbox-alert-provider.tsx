'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { useSocketEvent } from '@/components/providers/socket-provider';
import { SocketEvents } from '@/lib/socket-events';
import { cn } from '@/lib/utils';
import { MessageCircle } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const UNREAD_KEY = 'cliniqflow.whatsapp.unread';

type WhatsAppInboundPayload = {
  clinicId?: string;
  fromWaId?: string | null;
  contactName?: string | null;
  messagePreview?: string | null;
  receivedAt?: string;
};

interface WhatsAppInboxAlertContextValue {
  hasUnread: boolean;
  clearUnread: () => void;
}

const WhatsAppInboxAlertContext = createContext<WhatsAppInboxAlertContextValue>({
  hasUnread: false,
  clearUnread: () => undefined,
});

export function useWhatsAppInboxAlert() {
  return useContext(WhatsAppInboxAlertContext);
}

function readUnreadFlag(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(UNREAD_KEY) === '1';
}

function writeUnreadFlag(value: boolean) {
  if (typeof window === 'undefined') return;
  if (value) window.localStorage.setItem(UNREAD_KEY, '1');
  else window.localStorage.removeItem(UNREAD_KEY);
}

export function WhatsAppInboxAlertProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [hasUnread, setHasUnread] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastKey, setToastKey] = useState(0);

  useEffect(() => {
    if (!isAdmin) {
      setHasUnread(false);
      return;
    }
    setHasUnread(readUnreadFlag());
  }, [isAdmin]);

  const clearUnread = useCallback(() => {
    writeUnreadFlag(false);
    setHasUnread(false);
  }, []);

  useSocketEvent<WhatsAppInboundPayload>(SocketEvents.WHATSAPP_INBOUND, () => {
    if (!isAdmin) return;
    writeUnreadFlag(true);
    setHasUnread(true);
    setToastVisible(true);
    setToastKey((key) => key + 1);
  });

  useEffect(() => {
    if (!toastVisible) return;
    const timer = window.setTimeout(() => setToastVisible(false), 4000);
    return () => window.clearTimeout(timer);
  }, [toastVisible, toastKey]);

  const value = useMemo(
    () => ({
      hasUnread,
      clearUnread,
    }),
    [hasUnread, clearUnread],
  );

  return (
    <WhatsAppInboxAlertContext.Provider value={value}>
      {children}
      {isAdmin && toastVisible && (
        <div
          key={toastKey}
          className={cn(
            'pointer-events-none fixed left-1/2 top-4 z-[100] w-[min(92vw,420px)] -translate-x-1/2',
            'animate-in fade-in slide-in-from-top-2 duration-300',
          )}
          role="status"
          aria-live="polite"
        >
          <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-lg">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
              <MessageCircle className="h-4 w-4 text-emerald-700" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">New WhatsApp Message Available</p>
              <p className="text-xs text-muted-foreground">Open WhatsApp Messages to view the conversation.</p>
            </div>
          </div>
        </div>
      )}
    </WhatsAppInboxAlertContext.Provider>
  );
}
