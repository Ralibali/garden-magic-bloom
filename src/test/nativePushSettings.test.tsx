import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.hoisted(() => ({
  nativePushStatus: vi.fn(),
  disableNativePush: vi.fn(),
  enableNativePush: vi.fn(),
  testNativePush: vi.fn(),
}));
vi.mock('@/lib/nativePush', () => push);
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'review-user' } }) }));

import NativePushSettings from '@/components/NativePushSettings';

beforeEach(() => {
  vi.clearAllMocks();
  push.nativePushStatus.mockResolvedValue({ available: false, enabled: false, pending: false, permission: 'prompt' });
});

describe('native push availability', () => {
  it('hides push controls when the service is unavailable', async () => {
    await act(async () => { render(<NativePushSettings />); });
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(push.enableNativePush).not.toHaveBeenCalled();
  });

  it('keeps controls hidden if checking availability fails', async () => {
    push.nativePushStatus.mockRejectedValue(new Error('Service unavailable'));
    await act(async () => { render(<NativePushSettings />); });
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('allows revocation during an outage but disables test delivery', async () => {
    push.nativePushStatus.mockResolvedValue({ available: false, enabled: true, pending: false, permission: 'granted' });
    await act(async () => { render(<NativePushSettings />); });
    expect(screen.getByRole('button', { name: 'Skicka en testnotis' })).toBeDisabled();
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(push.disableNativePush).toHaveBeenCalledOnce());
    expect(push.testNativePush).not.toHaveBeenCalled();
  });

  it('shows controls only after the service confirms availability', async () => {
    push.nativePushStatus.mockResolvedValue({ available: true, enabled: false, pending: false, permission: 'prompt' });
    await act(async () => { render(<NativePushSettings />); });
    expect(screen.getByRole('switch')).toBeEnabled();
  });
});
