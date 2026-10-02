import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

const mocks = vi.hoisted(() => ({
  listener: undefined as ((event: AuthChangeEvent, session: Session | null) => void) | undefined,
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  clear: vi.fn(),
  trackEvent: vi.fn(),
  plausibleEvent: vi.fn(),
  sendAnalyticsEvent: vi.fn(),
  isNativeApp: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => {
  const queryClient = { clear: mocks.clear };
  return { useQueryClient: () => queryClient };
});
vi.mock('@/lib/native', () => ({ isNativeApp: mocks.isNativeApp, authWebOrigin: () => 'https://odlingsdagboken.com' }));
vi.mock('@/lib/ga4Runtime', () => ({ sendAnalyticsEvent: mocks.sendAnalyticsEvent }));
vi.mock('@/lib/analytics', () => ({ trackEvent: mocks.trackEvent, markLeadConverted: vi.fn() }));
vi.mock('@/lib/plausible', () => ({ plausibleEvent: mocks.plausibleEvent, track: vi.fn(), trackOnce: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      signInWithPassword: mocks.signInWithPassword,
      onAuthStateChange: (listener: typeof mocks.listener) => {
        mocks.listener = listener;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
    functions: { invoke: vi.fn().mockResolvedValue({ data: null }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
  },
}));

import { AuthProvider, useAuth } from './useAuth';

const user = { id: 'user-test', email: 'private@example.com', user_metadata: {} } as User;
const session = { user } as Session;
const completed = () => mocks.plausibleEvent.mock.calls.filter(([event]) => event === 'Login Completed');

async function mountAuth() {
  const hook = renderHook(useAuth, { wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider> });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isNativeApp.mockReturnValue(false);
  mocks.getSession.mockResolvedValue({ data: { session: null } });
  mocks.trackEvent.mockResolvedValue(undefined);
  mocks.signInWithPassword.mockResolvedValue({ data: { user, session }, error: null });
});

describe('login completion telemetry', () => {
  it('restores a session and handles repeated SIGNED_IN without recording a login', async () => {
    mocks.getSession.mockResolvedValue({ data: { session } });
    const hook = await mountAuth();
    await act(async () => {
      mocks.listener?.('INITIAL_SESSION', session);
      mocks.listener?.('SIGNED_IN', session);
      mocks.listener?.('TOKEN_REFRESHED', session);
      mocks.listener?.('SIGNED_IN', session);
    });
    expect(hook.result.current.isAuthenticated).toBe(true);
    expect(completed()).toEqual([]);
    expect(mocks.trackEvent).not.toHaveBeenCalledWith('login_completed', expect.anything());
    expect(mocks.sendAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('records one completion only after a successful explicit password login', async () => {
    const hook = await mountAuth();
    mocks.signInWithPassword.mockImplementationOnce(async () => {
      mocks.listener?.('SIGNED_IN', session);
      expect(completed()).toEqual([]);
      return { data: { user, session }, error: null };
    });
    await act(async () => { await hook.result.current.login(user.email, 'password'); });
    await act(async () => { mocks.listener?.('SIGNED_IN', session); });
    expect(hook.result.current.user?.id).toBe(user.id);
    expect(completed()).toEqual([['Login Completed', { method: 'email' }]]);
    expect(mocks.trackEvent.mock.calls.filter(([event]) => event === 'login_completed'))
      .toEqual([['login_completed', { method: 'email' }]]);
    expect(mocks.sendAnalyticsEvent).toHaveBeenCalledExactlyOnceWith('login', { props: { method: 'email' } });
  });

  it('does not label an OAuth session as an email login', async () => {
    const hook = await mountAuth();
    await act(async () => {
      mocks.listener?.('SIGNED_IN', { ...session, user: { ...user, app_metadata: { provider: 'google' } } });
    });
    expect(hook.result.current.isAuthenticated).toBe(true);
    expect(completed()).toEqual([]);
    expect(mocks.sendAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('preserves a failed login and sends no completion', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: { message: 'Invalid password' } });
    const hook = await mountAuth();
    await act(async () => {
      await expect(hook.result.current.login(user.email, 'wrong')).rejects.toThrow('Invalid password');
    });
    expect(hook.result.current.isAuthenticated).toBe(false);
    expect(completed()).toEqual([]);
    expect(mocks.sendAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('requires a returned session before recording a completion', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { user, session: null }, error: null });
    const hook = await mountAuth();
    await act(async () => { await hook.result.current.login(user.email, 'password'); });
    expect(completed()).toEqual([]);
    expect(mocks.sendAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('does not send the browser login event in the native app', async () => {
    mocks.isNativeApp.mockReturnValue(true);
    const hook = await mountAuth();
    await act(async () => { await hook.result.current.login(user.email, 'password'); });
    expect(hook.result.current.isAuthenticated).toBe(true);
    expect(mocks.sendAnalyticsEvent).not.toHaveBeenCalled();
  });
});
