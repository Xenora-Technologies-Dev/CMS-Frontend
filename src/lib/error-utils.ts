import { ApiRequestError } from './api';

const TECHNICAL_PATTERNS = [
  /prisma/i,
  /invocation/i,
  /stack trace/i,
  /ECONNREFUSED/i,
  /fetch failed/i,
];

export function getFriendlyErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    if (TECHNICAL_PATTERNS.some((p) => p.test(err.message))) return fallback;
    return err.message;
  }

  if (err instanceof Error) {
    if (TECHNICAL_PATTERNS.some((p) => p.test(err.message)) || err.message.length > 160) {
      return fallback;
    }
    return err.message;
  }

  return fallback;
}
