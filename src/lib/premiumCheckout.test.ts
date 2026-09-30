import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import { PremiumCheckoutError, startPremiumCheckout } from '@/lib/premiumCheckout';

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), refreshSession: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: mocks.invoke }, auth: { refreshSession: mocks.refreshSession } },
}));

const PRICE_ID = 'price_yearly';

function httpFailure(status: number, body: unknown) {
  const response = new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  });
  return { data: null, error: new FunctionsHttpError(response) };
}

describe('Plus checkout response handling', () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
    mocks.refreshSession.mockReset().mockResolvedValue({
      data: { session: { access_token: 'refreshed-access-token' } }, error: null,
    });
  });

  it('preserves the handler error instead of the generic SDK message, without retrying HTTP 500', async () => {
    const failure = httpFailure(500, { error: 'Unknown plan' });
    mocks.invoke.mockResolvedValue(failure);

    const error = await startPremiumCheckout(PRICE_ID).catch((error: unknown) => error);

    expect(error).toBeInstanceOf(PremiumCheckoutError);
    expect(error).toMatchObject({ message: 'Unknown plan', status: 500 });
    expect(error).not.toHaveProperty('context');
    expect(error).not.toHaveProperty('cause');
    expect(await failure.error.context.json()).toEqual({ error: 'Unknown plan' });
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });

  it('preserves message-only gateway errors and their structured code', async () => {
    mocks.invoke.mockResolvedValue(httpFailure(500, { code: 'BOOT_ERROR', message: 'Checkout backend unavailable' }));

    await expect(startPremiumCheckout(PRICE_ID)).rejects.toMatchObject({
      message: 'Checkout backend unavailable', status: 500, code: 'BOOT_ERROR',
    });
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });

  it('preserves the live inactive-price error without refreshing authentication or retrying checkout', async () => {
    const message = 'The price specified is inactive. This field only accepts active prices.';
    mocks.invoke.mockResolvedValue({
      data: null,
      error: new FunctionsHttpError(new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'sb-error-code': 'EDGE_FUNCTION_ERROR' },
      })),
    });

    await expect(startPremiumCheckout(PRICE_ID)).rejects.toMatchObject({
      message, status: 500, code: 'EDGE_FUNCTION_ERROR',
    });
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith('create-checkout', { body: { priceId: PRICE_ID } });
  });

  it.each([503, 504])('uses a safe Swedish fallback for non-JSON HTTP %i', async (status) => {
    const rawResponse = '<html>Private gateway diagnostic</html>';
    mocks.invoke.mockResolvedValue({
      data: null,
      error: new FunctionsHttpError(new Response(rawResponse, {
        status, headers: { 'Content-Type': 'text/html', 'sb-error-code': 'IDLE_TIMEOUT' },
      })),
    });

    const error = await startPremiumCheckout(PRICE_ID).catch((error: unknown) => error);

    expect(error).toMatchObject({
      message: `Betalningstjänsten är tillfälligt otillgänglig (HTTP ${status}). Försök igen om en stund.`,
      status, code: 'IDLE_TIMEOUT',
    });
    expect(JSON.stringify(error)).not.toContain(rawResponse);
    expect(error).not.toHaveProperty('context');
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });

  it('uses a generic HTTP status fallback and discards unstructured error codes', async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: new FunctionsHttpError(new Response('private diagnostic', {
        status: 500, headers: { 'sb-error-code': 'private diagnostic with spaces' },
      })),
    });

    await expect(startPremiumCheckout(PRICE_ID)).rejects.toMatchObject({
      message: 'Betalningen kunde inte startas (HTTP 500). Försök igen.', status: 500, code: undefined,
    });
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });

  it('prefers a structured JSON code to the gateway header and message to error', async () => {
    const response = new Response(JSON.stringify({ code: 'price_unavailable', error: 'missing_price', message: 'Priset saknas.' }), {
      status: 400, headers: { 'sb-error-code': 'BOOT_ERROR' },
    });
    mocks.invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(response) });

    await expect(startPremiumCheckout(PRICE_ID)).rejects.toMatchObject({
      message: 'Priset saknas.', status: 400, code: 'price_unavailable',
    });
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });

  it('refreshes an actual HTTP 401 once and retries with the same price and refreshed bearer', async () => {
    mocks.invoke
      .mockResolvedValueOnce(httpFailure(401, { code: 401, message: 'Invalid JWT' }))
      .mockResolvedValueOnce({ data: { url: 'https://checkout.stripe.com/session' }, error: null });

    await expect(startPremiumCheckout(PRICE_ID)).resolves.toEqual({ url: 'https://checkout.stripe.com/session' });

    expect(mocks.refreshSession).toHaveBeenCalledExactlyOnceWith();
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
    expect(mocks.invoke).toHaveBeenNthCalledWith(1, 'create-checkout', { body: { priceId: PRICE_ID } });
    expect(mocks.invoke).toHaveBeenNthCalledWith(2, 'create-checkout', {
      body: { priceId: PRICE_ID }, headers: { Authorization: 'Bearer refreshed-access-token' },
    });
  });

  it('recovers the exact legacy authentication 500 observed in production', async () => {
    mocks.invoke.mockResolvedValueOnce(httpFailure(500, { error: 'User not authenticated' }))
      .mockResolvedValueOnce({ data: { url: 'https://checkout.stripe.com/session' }, error: null });

    await expect(startPremiumCheckout(PRICE_ID)).resolves.toEqual({ url: 'https://checkout.stripe.com/session' });
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
    expect(mocks.invoke).toHaveBeenLastCalledWith('create-checkout', {
      body: { priceId: PRICE_ID }, headers: { Authorization: 'Bearer refreshed-access-token' },
    });
  });

  it('stops after a repeated legacy authentication 500 and asks for a new login', async () => {
    mocks.invoke.mockResolvedValue(httpFailure(500, { error: 'User not authenticated' }));

    await expect(startPremiumCheckout(PRICE_ID)).rejects.toMatchObject({
      message: expect.stringContaining('Logga in igen'), status: 500,
    });
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
  });

  it('does not retry a legacy-looking error carrying a checkout URL', async () => {
    mocks.invoke.mockResolvedValue(httpFailure(500, {
      error: 'User not authenticated', url: 'https://checkout.stripe.com/session',
    }));

    await expect(startPremiumCheckout(PRICE_ID)).rejects.toMatchObject({ status: 500 });
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });

  it.each([
    { data: { session: null }, error: new Error('Refresh rejected') },
    { data: { session: null }, error: null },
  ])('asks for login when refresh provides no usable session', async (refreshResult) => {
    mocks.invoke.mockResolvedValue(httpFailure(401, { code: 401, message: 'Invalid JWT' }));
    mocks.refreshSession.mockResolvedValue(refreshResult);

    await expect(startPremiumCheckout(PRICE_ID)).rejects.toMatchObject({
      message: expect.stringContaining('Logga in igen'), status: 401,
    });
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });

  it('asks for login if refresh throws, without another checkout attempt', async () => {
    mocks.invoke.mockResolvedValue(httpFailure(401, { message: 'Invalid JWT' }));
    mocks.refreshSession.mockRejectedValue(new Error('Refresh unavailable'));

    await expect(startPremiumCheckout(PRICE_ID)).rejects.toThrow('Logga in igen');
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });

  it('stops after a second 401 and never retains the token or raw Response', async () => {
    mocks.invoke.mockResolvedValue(httpFailure(401, { code: 401, message: 'Invalid JWT' }));

    const error = await startPremiumCheckout(PRICE_ID).catch((error: unknown) => error);

    expect(error).toMatchObject({ message: expect.stringContaining('Logga in igen'), status: 401, code: 401 });
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(error)).not.toContain('refreshed-access-token');
    expect(error).not.toHaveProperty('context');
  });

  it.each([400, 500])('does not refresh or retry HTTP %i even when the JSON code says 401', async (status) => {
    mocks.invoke.mockResolvedValue(httpFailure(status, { code: 401, message: 'User not authenticated' }));

    await expect(startPremiumCheckout(PRICE_ID)).rejects.toMatchObject({ message: 'User not authenticated', status, code: 401 });
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });

  it('does not retry network failures', async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: new FunctionsFetchError(new TypeError('Network failed')) });

    await expect(startPremiumCheckout(PRICE_ID)).rejects.toThrow('Failed to send a request to the Edge Function');
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });

  it('does not treat a relay failure as a refreshable HTTP response', async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: new FunctionsRelayError(new Response('', { status: 401 })) });

    await expect(startPremiumCheckout(PRICE_ID)).rejects.toThrow('Relay Error invoking the Edge Function');
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });

  it('returns a successful checkout URL without a refresh or retry', async () => {
    mocks.invoke.mockResolvedValue({ data: { url: 'https://checkout.stripe.com/session' }, error: null });

    await expect(startPremiumCheckout(PRICE_ID)).resolves.toEqual({ url: 'https://checkout.stripe.com/session' });
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith('create-checkout', { body: { priceId: PRICE_ID } });
  });
});
