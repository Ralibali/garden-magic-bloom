import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { buildPlantCareProfile } from '@/lib/plantCareIntelligence';
const mocks = vi.hoisted(() => ({ write: vi.fn(), toast: vi.fn(), settings: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: 'gardener' } } }) },
  from: (table: string) => ({ upsert: (record: unknown) => mocks.write(table, record), update: (record: unknown) => ({ eq: () => ({ eq: () => mocks.write(table, record) }) }) }),
} }));
vi.mock('@/lib/api', () => ({ api: { getReminderSettings: async () => ({ settings: {} }), updateReminderSettings: mocks.settings } }));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('@/lib/analytics', () => ({ recordProductActivity: vi.fn() }));
import PlantCareCheckIn from '@/components/PlantCareCheckIn';
beforeEach(() => { vi.clearAllMocks(); mocks.write.mockResolvedValue({ error: null }); mocks.settings.mockResolvedValue({}); });
afterEach(cleanup);
function show() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><PlantCareCheckIn plant={{ id: 'plant' }} plantName="Monstera" profile={buildPlantCareProfile({})} trigger={<button>Öppna kontroll</button>} /></QueryClientProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Öppna kontroll' }));
  fireEvent.click(screen.getByRole('button', { name: /Lagom fuktig/ }));
  fireEvent.click(screen.getByRole('button', { name: /Pigg/ }));
  fireEvent.change(screen.getByLabelText('Anteckning om växtkontrollen'), { target: { value: 'Nytt blad!' } });
}
describe('saving real plant care', () => {
  it('stops on a failed structured event and preserves the draft with no false success', async () => {
    mocks.write.mockResolvedValueOnce({ error: new Error('Tillfälligt fel') });
    show(); fireEvent.click(screen.getByRole('button', { name: 'Spara kontroll' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Kunde inte spara kontrollen' })));
    expect(screen.getByLabelText('Anteckning om växtkontrollen')).toHaveValue('Nytt blad!');
    expect(mocks.write).toHaveBeenCalledTimes(1);
    expect(mocks.write.mock.calls[0][0]).toBe('plant_care_events');
    const firstId = mocks.write.mock.calls[0][1].id;
    fireEvent.click(screen.getByRole('button', { name: 'Spara kontroll' }));
    await waitFor(() => expect(screen.queryByLabelText('Anteckning om växtkontrollen')).not.toBeInTheDocument());
    expect(mocks.write.mock.calls[1][1].id).toBe(firstId);
  });
  it('records a moist check without watering and schedules an actual follow-up', async () => {
    show(); fireEvent.click(screen.getByRole('button', { name: 'Spara kontroll' }));
    await waitFor(() => expect(mocks.settings).toHaveBeenCalled());
    expect(mocks.write).toHaveBeenCalledWith('plant_care_events', expect.objectContaining({ plant_id: 'plant', event_type: 'health_check', soil_moisture: 'moist', note: 'Nytt blad!' }));
    expect(mocks.write.mock.calls.some(([table]) => table === 'watering_log' || table === 'my_plants')).toBe(false);
    expect(mocks.settings.mock.calls[0][0].settings.reminders[0]).toEqual(expect.objectContaining({ plant_id: 'plant', done: false }));
  });
  it('distinguishes a saved check from a failed reminder', async () => {
    mocks.settings.mockRejectedValue(new Error('offline'));
    show(); fireEvent.click(screen.getByRole('button', { name: 'Spara kontroll' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: expect.stringContaining('påminnelsen kunde inte skapas') })));
    expect(screen.queryByLabelText('Anteckning om växtkontrollen')).not.toBeInTheDocument();
  });
});
