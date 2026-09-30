import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FunctionsHttpError } from '@supabase/supabase-js';
import Premium from '@/pages/Premium';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(), refreshSession: vi.fn(), toast: vi.fn(), trackEvent: vi.fn(), native: vi.fn(),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: mocks.invoke }, auth: { refreshSession: mocks.refreshSession } },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'gardener', subscription_status: 'free' } }) }));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('@/lib/analytics', () => ({ trackEvent: mocks.trackEvent }));
vi.mock('@/lib/plausible', () => ({ track: vi.fn(), trackOnce: vi.fn() }));
vi.mock('@/lib/native', () => ({ isNativeApp: mocks.native }));

const YEARLY_PRICE_ID = 'price_1T99UJHzffTezY826uLS56sV';
const CHECKOUT_URL = 'https://checkout.stripe.com/session';
const originalLocation = Object.getOwnPropertyDescriptor(window, 'location')!;

function show() {
  render(<MemoryRouter initialEntries={['/app/premium']}><Premium /></MemoryRouter>);
}

function consentAndCheckout() {
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Beställ med betalningsskyldighet' }));
}

function httpFailure(status: number, body: unknown) {
  return { data: null, error: new FunctionsHttpError(new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  })) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.invoke.mockReset().mockResolvedValue({ data: { url: CHECKOUT_URL }, error: null });
  mocks.refreshSession.mockReset();
  mocks.native.mockReturnValue(false);
  localStorage.clear();
  Object.defineProperty(window, 'location', { configurable: true, value: { href: 'http://localhost/app/premium' } });
});

afterEach(() => {
  cleanup();
  Object.defineProperty(window, 'location', originalLocation);
});

describe('Plus checkout customer flow', () => {
  it('keeps payment disabled until the customer accepts the existing consent', async () => {
    show();
    const button = screen.getByRole('button', { name: 'Beställ med betalningsskyldighet' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mocks.invoke).not.toHaveBeenCalled();

    consentAndCheckout();
    await waitFor(() => expect(window.location.href).toBe(CHECKOUT_URL));
    expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith('create-checkout', { body: { priceId: YEARLY_PRICE_ID } });
    expect(JSON.parse(localStorage.getItem('plus-withdrawal-consent')!)).toMatchObject({ price_sek: 99, plan: 'yearly-99' });
    expect(mocks.refreshSession).not.toHaveBeenCalled();
  });

  it('shows the actual server message and safe metadata, then permits a manual retry', async () => {
    mocks.invoke.mockResolvedValue(httpFailure(500, {
      error: 'price_unavailable', message: 'Det valda priset är inte tillgängligt.', code: 'PRICE_UNAVAILABLE',
    }));
    show();
    consentAndCheckout();

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({
      title: 'Kunde inte starta betalningen', description: 'Det valda priset är inte tillgängligt.', variant: 'destructive',
    }));
    expect(mocks.trackEvent).toHaveBeenCalledWith('checkout_failed', {
      message: 'Det valda priset är inte tillgängligt.', status: 500, code: 'PRICE_UNAVAILABLE',
    });
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    const button = screen.getByRole('button', { name: 'Beställ med betalningsskyldighet' });
    expect(button).not.toBeDisabled();

    mocks.invoke.mockResolvedValue({ data: { url: CHECKOUT_URL }, error: null });
    fireEvent.click(button);
    await waitFor(() => expect(window.location.href).toBe(CHECKOUT_URL));
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
  });

  it.each([
    { status: 401, body: { code: 401, message: 'Invalid JWT' } },
    { status: 500, body: { error: 'User not authenticated' } },
  ])('recovers the confirmed authentication error $status and redirects using the refreshed session', async ({ status, body }) => {
    mocks.invoke.mockResolvedValueOnce(httpFailure(status, body))
      .mockResolvedValueOnce({ data: { url: CHECKOUT_URL }, error: null });
    mocks.refreshSession.mockResolvedValue({ data: { session: { access_token: 'refreshed-token' } }, error: null });
    show();
    consentAndCheckout();

    await waitFor(() => expect(window.location.href).toBe(CHECKOUT_URL));
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
    expect(mocks.invoke).toHaveBeenLastCalledWith('create-checkout', {
      body: { priceId: YEARLY_PRICE_ID }, headers: { Authorization: 'Bearer refreshed-token' },
    });
    expect(mocks.toast).not.toHaveBeenCalled();
    expect(mocks.trackEvent).not.toHaveBeenCalledWith('checkout_failed', expect.anything());
  });

  it('shows a safe fallback for an HTML service failure and enables another attempt', async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(new Response('<html>Private details</html>', {
      status: 503, headers: { 'Content-Type': 'text/html', 'sb-error-code': 'BOOT_ERROR' },
    })) });
    show();
    consentAndCheckout();

    const message = 'Betalningstjänsten är tillfälligt otillgänglig (HTTP 503). Försök igen om en stund.';
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: message })));
    expect(mocks.trackEvent).toHaveBeenCalledWith('checkout_failed', { message, status: 503, code: 'BOOT_ERROR' });
    expect(JSON.stringify(mocks.trackEvent.mock.calls)).not.toContain('Private details');
    expect(screen.getByRole('button', { name: 'Beställ med betalningsskyldighet' })).not.toBeDisabled();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.refreshSession).not.toHaveBeenCalled();
  });

  it('reports a missing checkout URL and restores the button', async () => {
    mocks.invoke.mockResolvedValue({ data: {}, error: null });
    show();
    consentAndCheckout();

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      description: 'Ingen betalningslänk returnerades.', variant: 'destructive',
    })));
    expect(screen.getByRole('button', { name: 'Beställ med betalningsskyldighet' })).not.toBeDisabled();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });

  it('preserves the native block even after consent', () => {
    mocks.native.mockReturnValue(true);
    show();
    consentAndCheckout();

    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(mocks.trackEvent).not.toHaveBeenCalled();
  });
});
