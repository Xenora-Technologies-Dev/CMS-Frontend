import { clearAuth, getToken } from './auth';
import type { ApiError, PaginatedMeta, PaginatedResponse } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

const DEFAULT_META: PaginatedMeta = { page: 1, limit: 20, total: 0, totalPages: 0 };

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
}

async function parseError(response: Response): Promise<ApiRequestError> {
  try {
    const payload = (await response.json()) as { error?: ApiError };
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

async function request<T>(path: string, options: RequestOptions = {}): Promise<Response> {
  const { body, auth = true, headers, ...rest } = options;

  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (auth) {
    const token = getToken();
    if (token) {
      (requestHeaders as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    clearAuth();
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  return response;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await request(path, options);

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json()) as { data: T };
  return payload.data;
}

export async function apiRequestPaginated<T>(
  path: string,
  options: RequestOptions = {},
): Promise<PaginatedResponse<T>> {
  const response = await request(path, options);
  const payload = (await response.json()) as Partial<PaginatedResponse<T>>;

  return {
    data: Array.isArray(payload.data) ? payload.data : [],
    meta: payload.meta ?? DEFAULT_META,
  };
}