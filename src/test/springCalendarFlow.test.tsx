import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import Sakalender from '@/pages/Sakalender';

const request = vi.hoisted(() => vi.fn());
vi.mock('@/components/PublicLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/hooks/useSeo', () => ({ Seo: () => null }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: false, loading: false }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: request } }));
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

function visit(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><QueryClientProvider client={new QueryClient()}><Sakalender /></QueryClientProvider></MemoryRouter>);
}

beforeEach(() => {
  localStorage.clear();
  request.mockReset();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

it('opens the same varieties on a second device, changes the zone and requests only the selected emails', async () => {
  const source = visit('/sakalender?mall=pallkrage-120x80&via=butik-1');
  fireEvent.change(screen.getByLabelText('Sök din ort (valfritt)'), { target: { value: 'Umeå' } });
  expect((screen.getByLabelText('Välj klimatzon') as HTMLSelectElement).value).toBe('6');
  fireEvent.click(screen.getByRole('button', { name: 'Tomat' }));
  fireEvent.change(screen.getByLabelText('Tomat', { selector: 'input' }), { target: { value: 'Sungold F1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Skapa min såkalender' }));
  expect(screen.getByText('Nästa steg i din plan')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Kopiera planlänk' }));
  const link = new URL((screen.getByLabelText('Delbar planlänk') as HTMLInputElement).value);
  source.unmount();
  localStorage.clear();
  sessionStorage.clear();

  visit(link.pathname + link.search + link.hash);
  expect(screen.getByRole('heading', { name: 'Tider för zon 6' })).toBeTruthy();
  fireEvent.click(screen.getByText('Ändra ort, zon eller grödor'));
  expect((screen.getByLabelText('Tomat', { selector: 'input' }) as HTMLInputElement).value).toBe('Sungold F1');
  fireEvent.change(screen.getByLabelText('Välj klimatzon'), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Skapa min såkalender' }));
  fireEvent.change(screen.getByLabelText('E-postadress'), { target: { value: 'odlare@example.se' } });
  request.mockResolvedValueOnce({ data: null, error: { code: 'retry' } });
  fireEvent.click(screen.getByRole('button', { name: 'Skicka planen' }));
  await screen.findByRole('alert');
  expect(screen.queryByText('Kontrollera din inkorg')).toBeNull();
  request.mockResolvedValueOnce({ data: 'accepted', error: null });
  fireEvent.click(screen.getByRole('button', { name: 'Skicka planen' }));
  await waitFor(() => expect(request).toHaveBeenCalledWith('request_sowing_calendar', expect.objectContaining({
    p_marketing: false, p_pilot: false, p_plan: expect.objectContaining({ zone: '2', varieties: { Tomat: 'Sungold F1' } }),
  })));
  expect(await screen.findByText('Kontrollera din inkorg')).toBeTruthy();
});
