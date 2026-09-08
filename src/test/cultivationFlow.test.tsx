import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const mocks = vi.hoisted(() => ({ getCultivationData: vi.fn(), addReminder: vi.fn(), toast: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'gardener' } }) }));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('@/lib/cultivationApi', () => ({ getCultivationData: mocks.getCultivationData }));
vi.mock('@/lib/reminders', () => ({ addReminder: mocks.addReminder }));
vi.mock('@/lib/diaryApi', () => ({ getDiaryPhotoUrl: vi.fn() }));
vi.mock('@/components/PlantCareCheckIn', () => ({ default: () => <button>Kolla växten</button> }));
vi.mock('@/components/PlantEditor', () => ({ default: () => <button>Redigera växt</button> }));
import Cultivations from '@/pages/Cultivations';
const fixture = { beds: [{ id: 'bed', name: 'Växthuset' }], sowings: [{ id: 's1', variety: 'Tomat', sow_date: '2026-05-01', status: 'transplanted', type: 'indoor', plant_kind: 'edible', bed_id: 'bed' }], plants: [], care: [], waterings: [], photos: [], harvests: [], pests: [], reminders: [] };
function Destination() { const location = useLocation(); return <pre data-testid="destination">{JSON.stringify(location.state)}</pre>; }
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/app/odlingar']}><Routes><Route path="/app/odlingar" element={<Cultivations />} /><Route path="*" element={<Destination />} /></Routes></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => { vi.clearAllMocks(); mocks.getCultivationData.mockResolvedValue(fixture); mocks.addReminder.mockResolvedValue(true); });
afterEach(cleanup);
describe('cultivation journeys', () => {
  it('shows an error and retries rather than presenting a missing garden as empty', async () => {
    mocks.getCultivationData.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(fixture);
    show();
    expect(await screen.findByRole('alert')).toHaveTextContent('kunde inte hämtas');
    expect(screen.queryByText('Vad vill du se växa?')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Försök igen' }));
    expect(await screen.findByRole('heading', { name: 'Tomat' })).toBeInTheDocument();
  });
  it('links to the exact sowing for editing instead of creating a duplicate', async () => {
    show(); await screen.findByRole('heading', { name: 'Tomat' });
    fireEvent.click(screen.getByRole('button', { name: 'Följ odlingen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Öppna hela loggen' }));
    expect(await screen.findByTestId('destination')).toHaveTextContent('"sowingId":"s1"');
  });
  it('passes the selected identity and place to a photo upload', async () => {
    show(); await screen.findByRole('heading', { name: 'Tomat' });
    fireEvent.click(screen.getByRole('button', { name: 'Följ odlingen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Spara ett foto' }));
    const destination = await screen.findByTestId('destination');
    expect(destination).toHaveTextContent('"sowing_id":"s1"');
    expect(destination).toHaveTextContent('"bed_id":"bed"');
    expect(destination).toHaveTextContent('"openUpload":true');
  });
  it('keeps a failed reminder draft and saves its exact plant connection on retry', async () => {
    mocks.addReminder.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    show(); await screen.findByRole('heading', { name: 'Tomat' });
    fireEvent.click(screen.getByRole('button', { name: 'Planera nästa steg för Tomat' }));
    fireEvent.change(screen.getByLabelText('Vad vill du göra?'), { target: { value: 'Bind upp tomaten' } });
    fireEvent.click(screen.getByRole('button', { name: 'Spara påminnelse' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Din text finns kvar');
    expect(screen.getByLabelText('Vad vill du göra?')).toHaveValue('Bind upp tomaten');
    expect(mocks.toast).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Spara påminnelse' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalled());
    expect(mocks.addReminder).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Bind upp tomaten', sowing_id: 's1', bed_id: 'bed' }));
  });
});
