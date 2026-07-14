'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn, formatDateTime } from '@/lib/utils';
import {
  getWhatsAppConversation,
  listWhatsAppConversations,
  type WhatsAppConversationMessage,
  type WhatsAppConversationSummary,
} from '@/lib/whatsapp-messages-api';
import { useWhatsAppInboxAlert } from '@/components/whatsapp/whatsapp-inbox-alert-provider';
import { Loader2, MessageCircle, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function displayName(conversation: Pick<WhatsAppConversationSummary, 'patientName' | 'contactName' | 'waId'>) {
  return conversation.patientName || conversation.contactName || conversation.waId;
}

function formatWaId(waId: string): string {
  if (waId.startsWith('971') && waId.length >= 12) {
    return `+${waId.slice(0, 3)} ${waId.slice(3, 5)} ${waId.slice(5, 8)} ${waId.slice(8)}`;
  }
  return waId.startsWith('+') ? waId : `+${waId}`;
}

function kindLabel(kind: WhatsAppConversationMessage['kind']): string | null {
  switch (kind) {
    case 'auto_reply':
      return 'Auto-reply';
    case 'appointment_notification':
      return 'Appointment notification';
    case 'reaction':
      return 'Reaction';
    default:
      return null;
  }
}

function MessageBubble({ message }: { message: WhatsAppConversationMessage }) {
  const outbound = message.direction === 'outbound';
  const label = kindLabel(message.kind);

  return (
    <div className={cn('flex w-full', outbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3 py-2 shadow-sm sm:max-w-[70%]',
          outbound
            ? 'rounded-br-md bg-[#d9fdd3] text-slate-900'
            : 'rounded-bl-md bg-white text-slate-900',
        )}
      >
        {label && (
          <p
            className={cn(
              'mb-1 text-[10px] font-semibold uppercase tracking-wide',
              outbound ? 'text-emerald-800/80' : 'text-slate-500',
            )}
          >
            {label}
          </p>
        )}
        <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{message.text}</p>
        <div className="mt-1 flex items-center justify-end gap-1.5">
          <time className="text-[10px] text-slate-500">{formatDateTime(message.sentAt)}</time>
        </div>
      </div>
    </div>
  );
}

export default function WhatsAppMessagesPage() {
  const { clearUnread } = useWhatsAppInboxAlert();
  const [conversations, setConversations] = useState<WhatsAppConversationSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);

  const [selectedWaId, setSelectedWaId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsAppConversationMessage[]>([]);
  const [selectedMeta, setSelectedMeta] = useState<{
    waId: string;
    contactName: string | null;
    patientName: string | null;
  } | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const result = await listWhatsAppConversations({
        search: debouncedSearch || undefined,
        page: 1,
        limit: 80,
      });
      setConversations(result.data);
      setSelectedWaId((current) => {
        if (current && result.data.some((item) => item.waId === current)) return current;
        return current;
      });
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setListLoading(false);
    }
  }, [debouncedSearch]);

  const loadThread = useCallback(async (waId: string) => {
    setThreadLoading(true);
    setThreadError(null);
    try {
      const result = await getWhatsAppConversation(waId);
      setSelectedMeta(result.conversation);
      setMessages(result.messages);
    } catch (err) {
      setThreadError(err instanceof Error ? err.message : 'Failed to load conversation');
      setMessages([]);
    } finally {
      setThreadLoading(false);
    }
  }, []);

  useEffect(() => {
    clearUnread();
  }, [clearUnread]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedWaId) {
      setMessages([]);
      setSelectedMeta(null);
      return;
    }
    void loadThread(selectedWaId);
  }, [selectedWaId, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedWaId]);

  const selectedSummary = useMemo(
    () => conversations.find((item) => item.waId === selectedWaId) ?? null,
    [conversations, selectedWaId],
  );

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadConversations();
      if (selectedWaId) await loadThread(selectedWaId);
    } finally {
      setRefreshing(false);
    }
  }

  const headerTitle = selectedMeta
    ? displayName(selectedMeta)
    : selectedSummary
      ? displayName(selectedSummary)
      : 'Select a conversation';

  const headerSubtitle = selectedMeta?.waId
    ? formatWaId(selectedMeta.waId)
    : selectedSummary
      ? formatWaId(selectedSummary.waId)
      : 'Appointment notifications, patient replies, and auto-replies';

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[520px] overflow-hidden rounded-xl border border-slate-200 bg-[#efeae2] shadow-sm">
      {/* Conversation list */}
      <aside
        className={cn(
          'flex w-full max-w-none flex-col border-r border-slate-200/80 bg-[#f0f2f5] sm:max-w-[360px] sm:w-[340px]',
          selectedWaId ? 'hidden sm:flex' : 'flex',
        )}
      >
        <div className="space-y-3 border-b border-slate-200/80 bg-[#f0f2f5] px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25d366]/15">
                <MessageCircle className="h-4 w-4 text-[#128c7e]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">WhatsApp Messages</p>
                <p className="text-[11px] text-muted-foreground">Read-only conversation history</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => void handleRefresh()}
              disabled={refreshing || listLoading}
              title="Refresh"
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or number…"
              className="h-9 border-0 bg-white pl-9 shadow-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {listLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading conversations…
            </div>
          ) : listError ? (
            <p className="m-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {listError}
            </p>
          ) : conversations.length === 0 ? (
            <p className="px-4 py-16 text-center text-sm text-muted-foreground">
              No WhatsApp conversations yet. Sent appointment notifications and inbound webhook
              messages will appear here.
            </p>
          ) : (
            <ul>
              {conversations.map((conversation) => {
                const active = conversation.waId === selectedWaId;
                return (
                  <li key={conversation.waId}>
                    <button
                      type="button"
                      onClick={() => setSelectedWaId(conversation.waId)}
                      className={cn(
                        'flex w-full items-start gap-3 border-b border-slate-200/60 px-3 py-3 text-left transition-colors',
                        active ? 'bg-white' : 'hover:bg-white/70',
                      )}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dfe5e7] text-sm font-semibold text-[#54656f]">
                        {displayName(conversation).slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {displayName(conversation)}
                          </p>
                          <time className="shrink-0 text-[10px] text-muted-foreground">
                            {formatDateTime(conversation.lastMessageAt)}
                          </time>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {conversation.lastDirection === 'outbound' ? 'You: ' : ''}
                          {conversation.lastMessageText || 'No preview'}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Chat pane */}
      <section
        className={cn(
          'min-w-0 flex-1 flex-col',
          selectedWaId ? 'flex' : 'hidden sm:flex',
        )}
      >
        <header className="flex items-center gap-3 border-b border-slate-200/80 bg-[#f0f2f5] px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="sm:hidden"
            onClick={() => setSelectedWaId(null)}
          >
            Back
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dfe5e7] text-sm font-semibold text-[#54656f]">
            {headerTitle.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{headerTitle}</p>
            <p className="truncate text-xs text-muted-foreground">{headerSubtitle}</p>
          </div>
        </header>

        <div
          className="relative flex-1 overflow-y-auto px-3 py-4 sm:px-6"
          style={{
            backgroundImage:
              'linear-gradient(rgba(229,221,213,0.92), rgba(229,221,213,0.92)), url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23c5bdb2\' fill-opacity=\'0.35\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        >
          {!selectedWaId ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-600">
              Select a conversation to view messages
            </div>
          ) : threadLoading ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading messages…
            </div>
          ) : threadError ? (
            <p className="m-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              {threadError}
            </p>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-600">
              No messages in this conversation yet
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-2">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
