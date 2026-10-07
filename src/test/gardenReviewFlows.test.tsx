import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ConfirmEmail from '@/pages/ConfirmEmail';
import OnboardingFlow from '@/components/OnboardingFlow';
import CalendarAgendaView from '@/components/calendar/CalendarAgendaView';
import CropPriceEditor from '@/components/CropPriceEditor';
import PublicEmailCapture from '@/components/PublicEmailCapture';

const mocks = vi.hoisted(() => ({ verifyOtp: vi.fn(), getSession: vi.fn(), getUser: vi.fn(), getProfile: vi.fn(), updateProfile: vi.fn(), insert: vi.fn(), toast: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { verifyOtp: mocks.verifyOtp, getSession: mocks.getSession, getUser: mocks.getUser }, from: () => ({ insert: mocks.insert }) } }));
vi.mock('@/lib/api', () => ({ api: { getProfile: mocks.getProfile, updateProfile: mocks.updateProfile } }));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@/lib/plausible', () => ({ plausibleEvent: vi.fn() }));

beforeEach(() => {
  cleanup(); vi.clearAllMocks(); localStorage.clear();
  window.history.replaceState({}, '', '/');
  mocks.getProfile.mockResolvedValue({ preferences: { garden_categories: ['kokstradgard'], crop_prices: { morot: 18 } } });
  mocks.updateProfile.mockResolvedValue({});
});
const confirm = () => render(<StrictMode><MemoryRouter><HelmetProvider><ConfirmEmail /></HelmetProvider></MemoryRouter></StrictMode>);

describe('email confirmation', () => {
  it('verifies once in StrictMode, removes the token, then shows the confirmation before navigating', async () => {
    window.history.replaceState({}, '', '/auth/confirm#token_hash=test-only&type=email');
    mocks.verifyOtp.mockResolvedValue({ data: { session: {}, user: { email_confirmed_at: '2026-10-07' } }, error: null });
    confirm();
    expect(await screen.findByText('Din e-post är bekräftad')).toBeInTheDocument();
    expect(mocks.verifyOtp).toHaveBeenCalledTimes(1);
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: 'test-only', type: 'email' });
    expect(window.location.hash).toBe('');
    expect(screen.getByRole('button', { name: 'Öppna min odlingsdagbok' })).toBeInTheDocument();
  });
  it('does not announce success on expired links or an unrelated existing session', async () => {
    window.history.replaceState({}, '', '/auth/confirm#token_hash=expired&type=email');
    mocks.verifyOtp.mockResolvedValue({ data: {}, error: { message: 'Expired' } });
    confirm();
    expect(await screen.findByText('Länken kunde inte bekräftas')).toBeInTheDocument();
    cleanup();
    window.history.replaceState({}, '', '/auth/confirm');
    confirm();
    expect(await screen.findByText('Länken kunde inte bekräftas')).toBeInTheDocument();
    expect(mocks.getSession).not.toHaveBeenCalled();
  });
});

describe('onboarding and saved crop prices', () => {
  it('does not turn an Odlingsakuten diagnosis into selected crops, and skip saves no invented profile', async () => {
    localStorage.setItem('odlingsdagboken_latest_public_plan', JSON.stringify({ type: 'odlingsakuten', crop: 'Tomat', place: 'Pallkrage' }));
    const complete = vi.fn();
    render(<OnboardingFlow onComplete={complete} />);
    expect(screen.getByText(/steg 1 av 5/)).toBeInTheDocument();
    expect(screen.queryByText(/Vi har hämtat/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hoppa över' }));
    await waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(mocks.updateProfile).toHaveBeenCalledWith({ onboarding_completed: true });
  });
  it('waits for profile persistence before leaving onboarding and preserves choices on failure', async () => {
    localStorage.setItem('odlingsdagboken_latest_public_plan', JSON.stringify({ type: 'sakalender', zone: 4, method: 'Växthus', crops: ['Gurka'] }));
    const complete = vi.fn();
    mocks.updateProfile.mockRejectedValueOnce(new Error('Offline'));
    render(<OnboardingFlow onComplete={complete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Spara och öppna min dagbok' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalled());
    expect(complete).not.toHaveBeenCalled();
    expect(localStorage.getItem('odlingsdagboken_latest_public_plan')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Spara och öppna min dagbok' }));
    await waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(mocks.updateProfile.mock.calls[1][0]).toMatchObject({ climate_zone: 4, onboarding_completed: true, preferences: { preferred_crops: ['Gurka'], crop_prices: { morot: 18 } } });
    expect(localStorage.getItem('odlingsdagboken_latest_public_plan')).toBeNull();
  });
  it('stores decimal-comma prices in profile preferences without losing other settings', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><CropPriceEditor varieties={['Morot Nantes']} /></QueryClientProvider>);
    await waitFor(() => expect(client.getQueryData(['profile'])).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'Ändra grödpriser' }));
    fireEvent.change(screen.getByLabelText('Pris per kilo Morot Nantes'), { target: { value: '22,50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Spara priser' }));
    await waitFor(() => expect(mocks.updateProfile).toHaveBeenCalledWith({ preferences: { garden_categories: ['kokstradgard'], crop_prices: { morot: 22.5 } } }));
  });
});

it('lists ongoing autumn windows once without hiding personal events', () => {
  render(<CalendarAgendaView today="2026-10-07" zone={3} weeks={3} showGuide events={[
    { id: 'a', kind: 'reminder', date: '2026-10-07', title: 'Vattna vitlök' },
    { id: 'b', kind: 'reminder', date: '2026-10-14', title: 'Vattna vitlök' },
  ]} onSelectDay={vi.fn()} />);
  // Continuous windows do not generate a weekly task for each crop.
  expect(screen.getAllByRole('button', { name: /^Vitlök · v\./ })).toHaveLength(1);
  expect(screen.getAllByText('Vattna vitlök')).toHaveLength(2);
});

it('shows Swedish email validation and does not submit invalid addresses', async () => {
  render(<PublicEmailCapture source="odlingsakuten" plan={{}} />);
  fireEvent.change(screen.getByLabelText('E-postadress'), { target: { value: 'feladress' } });
  fireEvent.click(screen.getByRole('button', { name: 'Skicka planen' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Ange en giltig e-postadress');
  expect(mocks.insert).not.toHaveBeenCalled();
});
