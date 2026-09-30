import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  getProfile: vi.fn(),
  getSowings: vi.fn(),
  getHarvests: vi.fn(),
  getReminderSettings: vi.fn(),
  updateSowing: vi.fn(),
  updateProfile: vi.fn(),
  addReminder: vi.fn(),
  seedRpc: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('@/hooks/useSeo', () => ({ Seo: () => null }));
vi.mock('@/lib/api', () => ({
  api: {
    getProfile: mocks.getProfile,
    getSowings: mocks.getSowings,
    getHarvests: mocks.getHarvests,
    getReminderSettings: mocks.getReminderSettings,
    updateSowing: mocks.updateSowing,
    updateProfile: mocks.updateProfile,
  },
}));
vi.mock('@/lib/reminders', () => ({ addReminder: mocks.addReminder }));
vi.mock('@/lib/seedPlans', () => ({ seedRpc: mocks.seedRpc }));
vi.mock('@/lib/native', () => ({ isNativeApp: () => false }));
vi.mock('@/lib/gardenToday', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/gardenToday')>()),
  localDateKey: () => '2026-05-12',
}));

import SowingCalendar from '@/pages/SowingCalendar';

const tomato = {
  id: 'sow-1',
  variety: 'Tomat – Sungold',
  sow_date: '2026-03-23',
  type: 'indoor',
  status: 'indoor',
  plant_kind: 'edible',
  crop_key: 'tomat',
  bed_id: 'bed-1',
  transplant_date: null,
  beds: { name: 'Växthuset' },
};

function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/app/calendar']}>
        <SowingCalendar />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.getProfile.mockResolvedValue({ climate_zone: 3 });
  mocks.getSowings.mockResolvedValue([tomato]);
  mocks.getHarvests.mockResolvedValue([]);
  mocks.getReminderSettings.mockResolvedValue({
    settings: { reminders: [{ id: 'rem-1', title: 'Beställ jord', type: 'other', date: '2026-05-05', done: false }] },
  });
  mocks.updateSowing.mockResolvedValue({});
  mocks.addReminder.mockResolvedValue(true);
  mocks.seedRpc.mockResolvedValue({});
});
afterEach(cleanup);

describe('Odlingskalender', () => {
  it('visar beräknad utplantering och sparar den med ett tryck', async () => {
    show();
    const day = await screen.findByRole('button', { name: /^måndag 18 maj – / });
    expect(within(day).getByText('Plantera ut Tomat – Sungold')).toBeInTheDocument();
    fireEvent.click(day);
    const panel = await screen.findByRole('dialog');
    expect(within(panel).getByText('Dags att plantera ut · beräknat')).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole('button', { name: 'Utplanterad idag' }));
    await waitFor(() => expect(mocks.updateSowing).toHaveBeenCalledWith('sow-1', { status: 'transplanted', transplant_date: '2026-05-12' }));
  });

  it('lägger till en egen uppgift på vald dag', async () => {
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'onsdag 20 maj' }));
    const panel = await screen.findByRole('dialog');
    fireEvent.change(within(panel).getByLabelText('Ny uppgift den här dagen'), { target: { value: 'Gödsla tomaterna' } });
    fireEvent.click(within(panel).getByRole('button', { name: 'Lägg till uppgift' }));
    await waitFor(() => expect(mocks.addReminder).toHaveBeenCalledWith(expect.objectContaining({ title: 'Gödsla tomaterna', date: '2026-05-20', source: 'calendar' })));
  });

  it('bockar av en påminnelse direkt i kalendern', async () => {
    show();
    fireEvent.click(await screen.findByRole('button', { name: /^tisdag 5 maj – / }));
    const panel = await screen.findByRole('dialog');
    fireEvent.click(within(panel).getByRole('button', { name: 'Markera Beställ jord som klar' }));
    await waitFor(() => expect(mocks.seedRpc).toHaveBeenCalledWith('change_garden_reminder', expect.objectContaining({
      p_action: 'replace',
      p_item: expect.objectContaining({ id: 'rem-1', done: true }),
    })));
  });

  it('visar försenade uppgifter och veckans såguide i agendan', async () => {
    localStorage.setItem('odlingskalender:view', 'agenda');
    show();
    expect(await screen.findByText('1 uppgift är försenad')).toBeInTheDocument();
    expect(screen.getByText('Den här veckan')).toBeInTheDocument();
    expect(screen.getAllByText('Plantera ut Tomat – Sungold').length).toBeGreaterThan(0);
  });

  it('exporterar en .ics-fil', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:ics');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    show();
    await screen.findByRole('button', { name: /^måndag 18 maj – / });
    fireEvent.click(screen.getByRole('button', { name: /Till min kalender/ }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Kalenderfil skapad 📅' })));
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe('text/calendar;charset=utf-8');
    expect(click).toHaveBeenCalled();
    const text = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsText(blob); });
    expect(text).toContain('SUMMARY:Plantera ut Tomat – Sungold');
    click.mockRestore();
  });
});
