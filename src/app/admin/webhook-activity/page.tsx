'use client';

import { PaginationControls } from '@/components/shared/pagination-controls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { enableWebhookActivity } from '@/lib/feature-flags';
import type { PaginatedMeta } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  checkWebhookEndpoint,
  listWebhookActivity,
  unlockWebhookActivity,
  type WebhookActivityConfig,
  type WebhookActivityItem,
  type WebhookEndpointCheckResult,
} from '@/lib/webhook-activity-api';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Lock,
  MessageSquareText,
  Radio,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import { notFound, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const DEFAULT_META: PaginatedMeta = { page: 1, limit: 15, total: 0, totalPages: 0 };

const DEFAULT_CONFIG: WebhookActivityConfig = {
  loggingEnabled: false,
  verifyTokenConfigured: false,
  callbackUrl: null,
  storageOk: undefined,
  storageMessage: null,
  eventCount: null,
};

function toIsoFromLocalInput(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function eventKindStyles(kind: string): string {
  switch (kind) {
    case 'message':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'ingress':
      return 'bg-teal-50 text-teal-800 border-teal-200';
    case 'status':
      return 'bg-sky-50 text-sky-800 border-sky-200';
    case 'reaction':
      return 'bg-amber-50 text-amber-900 border-amber-200';
    case 'signature_rejected':
    case 'parse_error':
      return 'bg-rose-50 text-rose-800 border-rose-200';
    case 'empty':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-violet-50 text-violet-800 border-violet-200';
  }
}

function processingStyles(status: string): string {
  switch (status) {
    case 'auto_replied':
      return 'bg-emerald-600 text-white';
    case 'received':
      return 'bg-sky-600 text-white';
    case 'failed':
      return 'bg-rose-600 text-white';
    case 'skipped_cooldown':
      return 'bg-amber-500 text-white';
    case 'ignored':
      return 'bg-slate-500 text-white';
    default:
      return 'bg-slate-700 text-white';
  }
}

function formatLabel(value: string): string {
  return value.replace(/_/g, ' ');
}

function WebhookEventRow({ event }: { event: WebhookActivityItem }) {
  const [expanded, setExpanded] = useState(false);
  const title =
    event.contactName ||
    event.fromWaId ||
    (event.eventKind === 'status' ? `Status · ${event.status ?? 'unknown'}` : 'Webhook event');

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                eventKindStyles(event.eventKind),
              )}
            >
              {formatLabel(event.eventKind)}
            </span>
            <span
              className={cn(
                'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium capitalize',
                processingStyles(event.processingStatus),
              )}
            >
              {formatLabel(event.processingStatus)}
            </span>
            {event.messageType && (
              <span className="text-xs text-muted-foreground">{event.messageType}</span>
            )}
          </div>

          <div>
            <p className="font-medium text-slate-900">{title}</p>
            <p className="text-sm text-muted-foreground">
              {[
                event.fromWaId && event.contactName ? event.fromWaId : null,
                event.displayPhoneNumber ? `Business ${event.displayPhoneNumber}` : null,
                event.messageId ? `Msg ${event.messageId}` : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'Meta webhook ingress'}
            </p>
          </div>

          {event.messageText && (
            <div className="max-w-xl rounded-2xl rounded-tl-md border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white px-4 py-3 shadow-sm">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-emerald-700/80">
                <MessageSquareText className="h-3.5 w-3.5" />
                Message
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                {event.messageText}
              </p>
            </div>
          )}

          {event.processingNote && (
            <p className="text-sm text-muted-foreground">{event.processingNote}</p>
          )}

          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            {expanded ? 'Hide payload' : 'View payload JSON'}
          </button>

          {expanded && (
            <pre className="max-h-80 max-w-full overflow-auto rounded-md border border-slate-200 bg-slate-950 px-3 py-3 text-xs leading-relaxed text-slate-100">
              {JSON.stringify(event.payload, null, 2)}
            </pre>
          )}
        </div>

        <time className="shrink-0 text-xs text-muted-foreground sm:pt-1">
          {formatDateTime(event.receivedAt)}
        </time>
      </div>
    </li>
  );
}

export default function WebhookActivityPage() {
  if (!enableWebhookActivity) {
    notFound();
  }

  return <WebhookActivityPageContent />;
}

function WebhookActivityPageContent() {
  const router = useRouter();
  // Password is required on every visit (no session persistence).
  const [unlocked, setUnlocked] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(true);
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  function dismissPasswordPrompt() {
    setPasswordOpen(false);
    router.push('/admin');
  }

  const [events, setEvents] = useState<WebhookActivityItem[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta>(DEFAULT_META);
  const [config, setConfig] = useState<WebhookActivityConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [eventKind, setEventKind] = useState('');
  const [processingStatus, setProcessingStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [checkingEndpoint, setCheckingEndpoint] = useState(false);
  const [endpointCheck, setEndpointCheck] = useState<WebhookEndpointCheckResult | null>(null);

  const debouncedSearch = useDebouncedValue(search, 400);

  const load = useCallback(
    async (nextPage = 1) => {
      setLoading(true);
      setError(null);
      try {
        const result = await listWebhookActivity({
          page: nextPage,
          limit: 15,
          search: debouncedSearch || undefined,
          eventKind: eventKind || undefined,
          processingStatus: processingStatus || undefined,
          dateFrom: toIsoFromLocalInput(dateFrom),
          dateTo: toIsoFromLocalInput(dateTo),
        });
        setEvents(result.data);
        setMeta(result.meta);
        setConfig(result.config);
        setPage(nextPage);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load webhook activity');
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, eventKind, processingStatus, dateFrom, dateTo],
  );

  useEffect(() => {
    if (!unlocked) return;
    void load(1);
  }, [unlocked, load]);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setUnlocking(true);
    setUnlockError(null);
    try {
      await unlockWebhookActivity(password);
      setUnlocked(true);
      setPasswordOpen(false);
      setPassword('');
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : 'Incorrect password');
    } finally {
      setUnlocking(false);
    }
  }

  function clearFilters() {
    setSearch('');
    setEventKind('');
    setProcessingStatus('');
    setDateFrom('');
    setDateTo('');
  }

  const hasFilters = Boolean(search || eventKind || processingStatus || dateFrom || dateTo);

  async function handleCheckEndpoint() {
    setCheckingEndpoint(true);
    setEndpointCheck(null);
    try {
      const result = await checkWebhookEndpoint();
      setEndpointCheck(result);
    } catch (err) {
      setEndpointCheck({
        ok: false,
        callbackUrl: config.callbackUrl,
        verifyTokenConfigured: config.verifyTokenConfigured,
        statusCode: null,
        challengeMatched: false,
        durationMs: null,
        bodyPreview: null,
        message: err instanceof Error ? err.message : 'Failed to check webhook endpoint',
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setCheckingEndpoint(false);
    }
  }

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Lock className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <CardTitle>Webhook Activity</CardTitle>
                <CardDescription>Enter the developer password to continue.</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Dialog
          open={passwordOpen && !unlocked}
          onOpenChange={(open) => {
            if (!open && !unlocked) {
              dismissPasswordPrompt();
              return;
            }
            setPasswordOpen(open);
          }}
        >
          <DialogContent>
            <form onSubmit={(e) => void handleUnlock(e)}>
              <DialogHeader>
                <DialogTitle>Enter password</DialogTitle>
                <DialogDescription>
                  Webhook Activity is password protected. You will be asked again the next time you
                  open this page.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-4">
                <Label htmlFor="webhook-activity-password">Password</Label>
                <Input
                  id="webhook-activity-password"
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter access password"
                />
                {unlockError && <p className="text-sm text-destructive">{unlockError}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={dismissPasswordPrompt}>
                  Cancel
                </Button>
                <Button type="submit" disabled={unlocking || !password.trim()}>
                  {unlocking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Unlocking…
                    </>
                  ) : (
                    'Unlock'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-200/80 bg-[radial-gradient(ellipse_at_top_left,_rgba(16,185,129,0.08),_transparent_55%),linear-gradient(180deg,#fff_0%,#f8fafc_100%)]">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Radio className="h-5 w-5 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <CardTitle>Webhook Activity</CardTitle>
                <CardDescription>
                  Live Meta WhatsApp ingress for development and debugging. Production callback stays
                  on Render; enable logging there to inspect events here.
                </CardDescription>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => void handleCheckEndpoint()}
              disabled={checkingEndpoint}
              className="shrink-0 gap-2"
            >
              {checkingEndpoint ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {checkingEndpoint ? 'Checking…' : 'Check endpoint'}
            </Button>
          </div>

          {endpointCheck && (
            <div
              className={cn(
                'rounded-md border px-3 py-3 text-sm',
                endpointCheck.ok
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                  : 'border-rose-200 bg-rose-50 text-rose-950',
              )}
            >
              <div className="flex items-start gap-2">
                {endpointCheck.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
                )}
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">{endpointCheck.message}</p>
                  <p className="text-xs opacity-80">
                    {[
                      endpointCheck.callbackUrl,
                      endpointCheck.statusCode != null ? `HTTP ${endpointCheck.statusCode}` : null,
                      endpointCheck.durationMs != null ? `${endpointCheck.durationMs} ms` : null,
                      endpointCheck.challengeMatched ? 'challenge matched' : null,
                      endpointCheck.storageMessage,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {endpointCheck.bodyPreview && !endpointCheck.ok && (
                    <pre className="mt-2 max-h-28 overflow-auto rounded border border-black/10 bg-white/70 px-2 py-1.5 text-[11px] whitespace-pre-wrap text-slate-700">
                      {endpointCheck.bodyPreview}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Logging
              </p>
              <p className="text-sm font-medium text-slate-900">
                {config.loggingEnabled ? 'Enabled on API' : 'Disabled on API'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Verify token
              </p>
              <p className="text-sm font-medium text-slate-900">
                {config.verifyTokenConfigured ? 'Configured' : 'Missing'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Event storage
              </p>
              <p className="text-sm font-medium text-slate-900">
                {config.storageOk === undefined
                  ? 'Unknown'
                  : config.storageOk
                    ? 'Ready'
                    : 'Not ready'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Callback URL
              </p>
              <p
                className="truncate text-sm font-medium text-slate-900"
                title={config.callbackUrl ?? undefined}
              >
                {config.callbackUrl ?? 'Set WHATSAPP_WEBHOOK_BASE_URL'}
              </p>
            </div>
          </div>

          {config.storageMessage && config.storageOk === false && (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-950">
              {config.storageMessage}
            </p>
          )}

          {!config.loggingEnabled && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Set <code className="rounded bg-amber-100 px-1">WHATSAPP_WEBHOOK_ACTIVITY_LOGGING=true</code>{' '}
              on the Render service that receives Meta webhooks, then redeploy.
            </p>
          )}

          <p className="rounded-md border border-slate-200 bg-white/70 px-3 py-2 text-xs text-muted-foreground">
            GET verify can succeed while Meta &quot;Send to my server&quot; POSTs still fail — usually a wrong{' '}
            <code className="rounded bg-slate-100 px-1">WHATSAPP_APP_SECRET</code> (shows as{' '}
            <strong>signature rejected</strong>) or a missing DB migration (Event storage: Not ready).
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
              <Label htmlFor="webhook-search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="webhook-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Sender, message, message id…"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="webhook-kind">Event kind</Label>
              <select
                id="webhook-kind"
                value={eventKind}
                onChange={(e) => setEventKind(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All</option>
                <option value="ingress">Ingress</option>
                <option value="message">Message</option>
                <option value="status">Status</option>
                <option value="reaction">Reaction</option>
                <option value="signature_rejected">Signature rejected</option>
                <option value="parse_error">Parse error</option>
                <option value="empty">Empty</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="webhook-status">Processing</Label>
              <select
                id="webhook-status"
                value={processingStatus}
                onChange={(e) => setProcessingStatus(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All</option>
                <option value="received">Received</option>
                <option value="auto_replied">Auto replied</option>
                <option value="skipped_cooldown">Skipped cooldown</option>
                <option value="ignored">Ignored</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="webhook-from">From</Label>
              <Input
                id="webhook-from"
                type="datetime-local"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="webhook-to">To</Label>
              <Input
                id="webhook-to"
                type="datetime-local"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {hasFilters && (
            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-3.5 w-3.5" />
                Clear filters
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">{meta.total} total events</p>

          {error && (
            <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading webhook activity…
            </div>
          ) : events.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {hasFilters
                ? 'No webhook events match your filters'
                : 'No webhook events recorded yet'}
            </p>
          ) : (
            <ul className="divide-y">
              {events.map((event) => (
                <WebhookEventRow key={event.id} event={event} />
              ))}
            </ul>
          )}

          <div className="mt-6">
            <PaginationControls
              meta={{ ...meta, page }}
              onPageChange={(nextPage) => void load(nextPage)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
