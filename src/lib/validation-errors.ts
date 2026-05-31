import { ApiRequestError } from './api';

interface ZodFlattened {
  formErrors?: string[];
  fieldErrors?: Record<string, string[]>;
}

export function formatValidationDetails(details: unknown): string | null {
  if (!details || typeof details !== 'object') return null;
  const flat = details as ZodFlattened;
  const messages: string[] = [
    ...(flat.formErrors ?? []),
    ...Object.entries(flat.fieldErrors ?? {}).flatMap(([field, errs]) =>
      errs.map((msg) => `${field}: ${msg}`),
    ),
  ];
  return messages.length > 0 ? messages.join(' · ') : null;
}

export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    const detailMessage = formatValidationDetails(err.details);
    if (detailMessage) return detailMessage;
    return err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
