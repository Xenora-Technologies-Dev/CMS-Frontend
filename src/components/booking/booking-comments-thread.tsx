'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createBookingComment, listBookingComments, type BookingComment } from '@/lib/booking-api';
import { formatDateTime } from '@/lib/utils';
import { Loader2, Send } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface BookingCommentsThreadProps {
  bookingId: string;
  canComment: boolean;
  viewerRole: 'admin' | 'therapist' | 'doctor';
  /** When true, load all comments across the patient's bookings (doctor self-booking). */
  patientScope?: boolean;
}

function authorRoleLabel(role: BookingComment['author']['role']): string {
  if (role === 'THERAPIST') return 'Therapist';
  if (role === 'DOCTOR') return 'Doctor';
  return 'Admin';
}

export function BookingCommentsThread({
  bookingId,
  canComment,
  viewerRole,
  patientScope = false,
}: BookingCommentsThreadProps) {
  const [comments, setComments] = useState<BookingComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { comments: rows } = await listBookingComments(bookingId, { patientScope });
      setComments(rows);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [bookingId, patientScope]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { comment } = await createBookingComment(bookingId, draft.trim());
      setComments((prev) => [...prev, comment]);
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 border-t pt-3">
      <p className="text-sm font-medium text-slate-900">
        {patientScope ? 'Patient Comments' : 'Session Comments'}
      </p>
      {patientScope && (
        <p className="text-xs text-muted-foreground">
          All comments across this patient&apos;s appointments.
        </p>
      )}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading comments…
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`rounded-lg border p-3 ${
                comment.author.role === 'THERAPIST' || comment.author.role === 'DOCTOR'
                  ? 'border-primary/20 bg-primary/5'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">
                  {comment.author.firstName} {comment.author.lastName}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {authorRoleLabel(comment.author.role)}
                  </span>
                </p>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(comment.createdAt)}
                </span>
              </div>
              {patientScope && comment.booking && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {comment.booking.bookingType === 'CONSULTATION'
                    ? 'Consultation'
                    : comment.booking.therapy?.name ?? 'Therapy'}
                  {' · '}
                  {formatDateTime(comment.booking.startTime)}
                </p>
              )}
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{comment.content}</p>
            </div>
          ))}
        </div>
      )}

      {canComment && (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              viewerRole === 'therapist' || viewerRole === 'doctor'
                ? 'Add a comment (admins will be notified)…'
                : 'Add a comment…'
            }
            rows={3}
            disabled={saving}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="sm" disabled={saving || !draft.trim()}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting…
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Post Comment
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
