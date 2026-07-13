/**
 * Client-visible feature flags (NEXT_PUBLIC_*).
 * Defaults are off unless the env value is exactly "true".
 */
export const enableWebhookActivity =
  process.env.NEXT_PUBLIC_ENABLE_WEBHOOK_ACTIVITY === 'true';
