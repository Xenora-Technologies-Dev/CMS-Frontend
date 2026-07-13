'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createManualBackup,
  getRecentBackups,
  restoreBackupFromZip,
  unlockBackupAccess,
  type BackupRecord,
  type RestoreRecord,
} from '@/lib/backup-api';
import { ApiRequestError } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import {
  DatabaseBackup,
  HardDriveDownload,
  Loader2,
  Lock,
  RefreshCw,
  RotateCcw,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const UNLOCK_KEY = 'cliniqflow.backup.unlocked';

function isUnlockedSession(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(UNLOCK_KEY) === '1';
}

function setUnlockedSession() {
  sessionStorage.setItem(UNLOCK_KEY, '1');
}

export default function BackupRestorePage() {
  const [unlocked, setUnlocked] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(true);
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [driveConfigured, setDriveConfigured] = useState(true);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [restores, setRestores] = useState<RestoreRecord[]>([]);

  const [backingUp, setBackingUp] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isUnlockedSession()) {
      setUnlocked(true);
      setPasswordOpen(false);
    }
  }, []);

  const loadRecent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRecentBackups();
      setBackups(data.backups);
      setRestores(data.restores);
      setDriveConfigured(data.driveConfigured);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backup history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    void loadRecent();
  }, [unlocked, loadRecent]);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setUnlocking(true);
    setUnlockError(null);
    try {
      await unlockBackupAccess(password);
      setUnlockedSession();
      setUnlocked(true);
      setPasswordOpen(false);
      setPassword('');
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : 'Incorrect password');
    } finally {
      setUnlocking(false);
    }
  }

  async function handleBackup() {
    setBackingUp(true);
    setBackupMessage(null);
    setError(null);
    try {
      const result = await createManualBackup();
      setBackupMessage(`Backup completed: ${result.fileName ?? 'zip uploaded to Google Drive'}`);
      await loadRecent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup failed');
    } finally {
      setBackingUp(false);
    }
  }

  async function handleRestore() {
    if (!restoreFile) {
      setRestoreError('Please choose a .zip backup file');
      return;
    }
    setRestoring(true);
    setRestoreError(null);
    setRestoreMessage(null);
    try {
      const result = await restoreBackupFromZip(restoreFile);
      setRestoreMessage(
        `Restore completed successfully: ${result.fileName}. Please log out and log in again with an account from the restored backup.`,
      );
      setRestoreFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadRecent();
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Restore failed';
      setRestoreError(message);
    } finally {
      setRestoring(false);
    }
  }

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Backup & Restore</CardTitle>
                <CardDescription>Enter the access password to continue.</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Dialog
          open={passwordOpen || !unlocked}
          onOpenChange={(open) => {
            if (!unlocked) {
              setPasswordOpen(true);
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
                  This area is restricted. Other admins will be notified when you unlock it.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-4">
                <Label htmlFor="backup-password">Password</Label>
                <Input
                  id="backup-password"
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter access password"
                />
                {unlockError && <p className="text-sm text-destructive">{unlockError}</p>}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={unlocking || !password}>
                  {unlocking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Unlock
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
      {(backingUp || restoring) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-3 rounded-lg bg-background px-8 py-6 shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">
              {backingUp ? 'Backup in progress…' : 'Restore in progress…'}
            </p>
            <p className="text-xs text-muted-foreground">Please wait until the operation completes.</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <DatabaseBackup className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Backup & Restore</CardTitle>
                <CardDescription>
                  Create a database zip backup to Google Drive, or restore from a zip file.
                </CardDescription>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadRecent()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>
          {!driveConfigured && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Google Drive is not configured on the server. Set GOOGLE_DRIVE_FOLDER_ID and either
              OAuth (GOOGLE_DRIVE_OAUTH_CLIENT_ID / SECRET / REFRESH_TOKEN) or a Shared Drive service
              account.
            </p>
          )}
          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {backupMessage && (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {backupMessage}
            </p>
          )}
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => void handleBackup()} disabled={backingUp || !driveConfigured}>
            <HardDriveDownload className="mr-2 h-4 w-4" />
            Backup
          </Button>
          <Button type="button" variant="outline" onClick={() => setRestoreOpen(true)} disabled={restoring}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restore
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent backups</CardTitle>
          <CardDescription>Last 5 backup runs (manual or auto).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Type</th>
                  <th className="px-2 py-2 font-medium">Date & time</th>
                  <th className="px-2 py-2 font-medium">Folder</th>
                  <th className="px-2 py-2 font-medium">File name</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {backups.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-2 py-6 text-center text-muted-foreground">
                      No backups yet.
                    </td>
                  </tr>
                )}
                {backups.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-2 py-2">{row.trigger === 'AUTO' ? 'Auto' : 'Manual'}</td>
                    <td className="px-2 py-2">{formatDateTime(row.createdAt)}</td>
                    <td className="px-2 py-2 font-mono text-xs">{row.folderName ?? '—'}</td>
                    <td className="px-2 py-2 font-mono text-xs">{row.fileName ?? '—'}</td>
                    <td className="px-2 py-2">
                      {row.status === 'SUCCESS' ? (
                        <span className="text-emerald-700">Success</span>
                      ) : (
                        <span className="text-destructive" title={row.errorMessage ?? undefined}>
                          Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent restores</CardTitle>
          <CardDescription>Last 5 restore attempts after success or failure.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Date & time</th>
                  <th className="px-2 py-2 font-medium">File name</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {restores.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-2 py-6 text-center text-muted-foreground">
                      No restores yet.
                    </td>
                  </tr>
                )}
                {restores.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-2 py-2">{formatDateTime(row.createdAt)}</td>
                    <td className="px-2 py-2 font-mono text-xs">{row.fileName}</td>
                    <td className="px-2 py-2">
                      {row.status === 'SUCCESS' ? (
                        <span className="text-emerald-700">Success</span>
                      ) : (
                        <span className="text-destructive" title={row.errorMessage ?? undefined}>
                          Failed{row.errorMessage ? ` — ${row.errorMessage}` : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={restoreOpen}
        onOpenChange={(open) => {
          if (restoring) return;
          setRestoreOpen(open);
          if (!open) {
            setRestoreError(null);
            setRestoreMessage(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore database</DialogTitle>
            <DialogDescription>
              Upload a previous backup zip. This replaces live data — use only on a recovered or
              freshly migrated database after Prisma migrate and demo login are ready.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="restore-file">Backup zip file</Label>
            <Input
              id="restore-file"
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => setRestoreFile(e.target.files?.[0] ?? null)}
            />
            {restoreMessage && (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {restoreMessage}
              </p>
            )}
            {restoreError && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {restoreError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={restoring} onClick={() => setRestoreOpen(false)}>
              Close
            </Button>
            <Button type="button" disabled={restoring || !restoreFile} onClick={() => void handleRestore()}>
              {restoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
