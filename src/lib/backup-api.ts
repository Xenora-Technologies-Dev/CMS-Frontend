import { clearAuth, getToken } from './auth';
import { ApiRequestError } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export type BackupTrigger = 'MANUAL' | 'AUTO';
export type BackupJobStatus = 'SUCCESS' | 'FAILED';

export interface BackupRecord {
  id: string;
  trigger: BackupTrigger;
  status: BackupJobStatus;
  folderName: string | null;
  fileName: string | null;
  errorMessage: string | null;
  createdAt: string;
  createdBy: { id: string; name: string; email: string } | null;
}

export interface RestoreRecord {
  id: string;
  status: BackupJobStatus;
  fileName: string;
  errorMessage: string | null;
  createdAt: string;
  createdBy: { id: string; name: string; email: string } | null;
}

export interface BackupRecentResponse {
  driveConfigured: boolean;
  backups: BackupRecord[];
  restores: RestoreRecord[];
}

async function parseError(response: Response): Promise<ApiRequestError> {
  try {
    const payload = (await response.json()) as {
      error?: { message?: string; code?: string; details?: unknown };
    };
    return new ApiRequestError(
      payload.error?.message ?? 'Request failed',
      response.status,
      payload.error?.code,
      payload.error?.details,
    );
  } catch {
    return new ApiRequestError('Request failed', response.status);
  }
}

export async function unlockBackupAccess(password: string): Promise<{ unlocked: boolean }> {
  const token = getToken();
  const response = await fetch(`${API_URL}/backups/unlock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ password }),
    credentials: 'omit',
  });

  if (response.status === 401) clearAuth();
  if (!response.ok) throw await parseError(response);

  const payload = (await response.json()) as { data: { unlocked: boolean } };
  return payload.data;
}

export async function getRecentBackups(): Promise<BackupRecentResponse> {
  const token = getToken();
  const response = await fetch(`${API_URL}/backups/recent`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'omit',
  });

  if (response.status === 401) clearAuth();
  if (!response.ok) throw await parseError(response);

  const payload = (await response.json()) as { data: BackupRecentResponse };
  return payload.data;
}

export async function createManualBackup(): Promise<{
  id: string;
  trigger: BackupTrigger;
  status: BackupJobStatus;
  folderName: string | null;
  fileName: string | null;
  createdAt: string;
}> {
  const token = getToken();
  const response = await fetch(`${API_URL}/backups`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'omit',
  });

  if (response.status === 401) clearAuth();
  if (!response.ok) throw await parseError(response);

  const payload = (await response.json()) as {
    data: {
      id: string;
      trigger: BackupTrigger;
      status: BackupJobStatus;
      folderName: string | null;
      fileName: string | null;
      createdAt: string;
    };
  };
  return payload.data;
}

export async function restoreBackupFromZip(file: File): Promise<{
  id: string;
  status: BackupJobStatus;
  fileName: string;
  createdAt: string;
}> {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);

  const response = await fetch(`${API_URL}/backups/restore`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
    credentials: 'omit',
  });

  if (response.status === 401) clearAuth();
  if (!response.ok) throw await parseError(response);

  const payload = (await response.json()) as {
    data: {
      id: string;
      status: BackupJobStatus;
      fileName: string;
      createdAt: string;
    };
  };
  return payload.data;
}
