import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const mocks = vi.hoisted(() => ({ garden: vi.fn(), diary: vi.fn(), profile: vi.fn() }));
vi.mock('@/lib/analytics', () => ({ recordProductActivity: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'gardener' } }) }));
vi.mock('@/lib/cultivationApi', () => ({ getCultivationData: mocks.garden }));
vi.mock('@/lib/diaryApi', () => ({ getDiary: mocks.diary, getDiaryPhotoUrl: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { getProfile: mocks.profile, getReminderSettings: vi.fn().mockResolvedValue({ settings: {} }), getRainHistory: vi.fn().mockResolvedValue(null) } }));
vi.mock('@/lib/gardenWeather', () => ({ getGardenForecast: vi.fn().mockResolvedValue(null), weatherDescription: () => '' }));
vi.mock('@/components/SeasonWrapDialog', () => ({ default: () => null }));
vi.mock('@/components/OnboardingFlow', () => ({ default: () => <div>Introduktion</div> }));
import Dashboard from '@/pages/Dashboard';
const empty = { beds: [], sowings: [], plants: [], care: [], waterings: [], photos: [], harvests: [], pests: [], reminders: [] };
function Destination() { const location = useLocation(); return <pre data-testid="destination">{JSON.stringify({ path: location.pathname, state: location.state })}</pre>; }
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/app']}><Routes><Route path="/app" element={<Dashboard />} /><Route path="*" element={<Destination />} /></Routes></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => { vi.clearAllMocks(); mocks.garden.mockResolvedValue(empty); mocks.diary.mockResolvedValue([]); mocks.profile.mockResolvedValue({ display_name: 'Alex', onboarding_completed: true, preferences: { garden_categories: ['kokstradgard'] } }); });
afterEach(cleanup);
describe('garden home journeys', () => {
  it('opens the existing diary editor rather than just navigating to the diary', async () => {
    show(); await screen.findByText('Din odling, Alex.');
    fireEvent.click(screen.getByRole('link', { name: 'Skriv i dagboken' }));
    expect(await screen.findByTestId('destination')).toHaveTextContent('"openEditor":true');
  });
  it('does not present a failed garden read as a first-time user', async () => {
    mocks.garden.mockRejectedValue(new Error('offline'));
    show();
    expect(await screen.findByText('Odlingarna kunde inte hämtas')).toBeInTheDocument();
    expect(screen.queryByText('Det börjar med något litet.')).not.toBeInTheDocument();
    expect(screen.queryByText('En lugn stund.')).not.toBeInTheDocument();
  });
  it('keeps the cultivation identity when opening a home card', async () => {
    mocks.garden.mockResolvedValue({ ...empty, sowings: [{ id: 'tomato', variety: 'Sungold', status: 'sown', sow_date: '2026-09-20', plant_kind: 'edible' }] });
    show();
    fireEvent.click(await screen.findByRole('link', { name: /Sungold/ }));
    expect(await screen.findByTestId('destination')).toHaveTextContent('"cultivationId":"sowing:tomato"');
  });
  it('gives plant-only gardeners a plant action instead of harvest prompts', async () => {
    mocks.profile.mockResolvedValue({ onboarding_completed: true, preferences: { garden_categories: ['krukvaxter'] } });
    show();
    expect(await screen.findByRole('link', { name: 'Ny växt' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Logga skörd' })).not.toBeInTheDocument();
  });
});
