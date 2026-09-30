import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type ErrorCode = string | number;

export type PremiumCheckoutData = {
  url?: string;
  error?: string;
  message?: string;
};

export class PremiumCheckoutError extends Error {
  readonly status?: number;
  readonly code?: ErrorCode;

  constructor(message: string, status?: number, code?: ErrorCode) {
    super(message);
    this.name = 'PremiumCheckoutError';
    this.status = status;
    this.code = code;
  }
}

const LOGIN_MESSAGE = 'Din inloggning fungerar inte längre. Logga in igen och försök skaffa Plus.';
const FALLBACK_MESSAGE = 'Betalningen kunde inte startas. Försök igen.';

function httpFallback(status: number): string {
  return status === 503 || status === 504
    ? `Betalningstjänsten är tillfälligt otillgänglig (HTTP ${status}). Försök igen om en stund.`
    : `Betalningen kunde inte startas (HTTP ${status}). Försök igen.`;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function safeCode(value: unknown): ErrorCode | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(value)) return value;
  return undefined;
}

async function decodeResult(result: { data: unknown; error: unknown }) {
  const response = result.error instanceof FunctionsHttpError && result.error.context instanceof Response
    ? result.error.context : null;
  let body = asObject(result.data);
  if (response) {
    try {
      body = asObject(await response.clone().json());
    } catch {
      // Gateway HTML or unstructured diagnostics must never become customer-facing text.
    }
  }
  const data: PremiumCheckoutData = {
    ...(typeof body.url === 'string' ? { url: body.url } : {}),
    ...(typeof body.error === 'string' ? { error: body.error } : {}),
    ...(typeof body.message === 'string' ? { message: body.message } : {}),
  };
  const code = safeCode(body.code) ?? safeCode(response?.headers.get('sb-error-code'));
  return { data, error: result.error, status: response?.status, code };
}

function isAuthenticationFailure(result: Awaited<ReturnType<typeof decodeResult>>): boolean {
  // The live legacy handler returns this exact 500 before any Stripe operation.
  // Never retry another server error, which may follow a created checkout session.
  return !result.data.url && (result.status === 401 || (
    result.status === 500 && result.data.error === 'User not authenticated'
  ));
}

/** Only a confirmed authentication rejection can safely retry checkout automatically. */
export async function startPremiumCheckout(priceId: string): Promise<PremiumCheckoutData> {
  let result = await decodeResult(await supabase.functions.invoke('create-checkout', { body: { priceId } }));

  if (isAuthenticationFailure(result)) {
    let accessToken: string | undefined;
    try {
      const refreshed = await supabase.auth.refreshSession();
      if (!refreshed.error) accessToken = refreshed.data.session?.access_token;
    } catch {
      // A failed refresh requires a new login; do not start another checkout request.
    }
    if (!accessToken) throw new PremiumCheckoutError(LOGIN_MESSAGE, result.status, result.code);

    result = await decodeResult(await supabase.functions.invoke('create-checkout', {
      body: { priceId },
      headers: { Authorization: `Bearer ${accessToken}` },
    }));
    if (isAuthenticationFailure(result)) throw new PremiumCheckoutError(LOGIN_MESSAGE, result.status, result.code);
  }

  if (result.error || result.data.error) {
    const sdkMessage = asObject(result.error).message;
    const fallback = result.status === undefined
      ? typeof sdkMessage === 'string' ? sdkMessage : FALLBACK_MESSAGE
      : httpFallback(result.status);
    throw new PremiumCheckoutError(
      result.data.message || result.data.error || fallback,
      result.status,
      result.code,
    );
  }
  return result.data;
}
