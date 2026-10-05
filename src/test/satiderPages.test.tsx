import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const auth = vi.hoisted(() => ({ isAuthenticated: false }));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: auth.isAuthenticated, loading: false, user: null }),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/lib/analytics', () => ({ trackEvent: () => {} }));
vi.mock('@/hooks/useSeo', () => ({ Seo: () => null }));
vi.mock('@/hooks/usePublishedSeoSlugs', () => ({
  usePublishedSeoSlugs: () => ({ data: { plants: [{ slug: 'tomat', name: 'Tomat' }], zones: [{ slug: 'zon-3', zone_number: 3 }] } }),
}));

import SatiderCrop from '@/pages/SatiderCrop';
import SatiderIndex from '@/pages/SatiderIndex';
import { destinationFromSearch, navigationForIntent } from '@/lib/productIntent';

function Where() {
  const location = useLocation();
  return <output data-testid="where">{location.pathname}{JSON.stringify(location.state)}</output>;
}

function show(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/satider" element={<SatiderIndex />} />
          <Route path="/satider/:slug" element={<SatiderCrop />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => { localStorage.clear(); auth.isAuthenticated = false; });
afterEach(cleanup);

describe('/satider/:gröda', () => {
  it('visar svaret, tabellen för alla zoner och länkar vidare', () => {
    show('/satider/tomat');
    expect(screen.getByRole('heading', { level: 1, name: 'När ska man så tomater?' })).toBeInTheDocument();
    expect(screen.getByTestId('quick-answer')).toHaveTextContent('förodlar du tomater inomhus vecka');
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(9);
    expect(within(table).getByRole('link', { name: 'Zon 3' })).toHaveAttribute('href', '/zoner/zon-3');
    expect(screen.getByRole('link', { name: 'Odla tomat – hela odlingsguiden' })).toHaveAttribute('href', '/vaxter/tomat');
    expect(screen.getByRole('link', { name: 'Odlingskalender för mars' })).toHaveAttribute('href', '/odlingskalender/mars');
    expect(screen.getByText('Hur långt före sista frost ska man förodla tomater?')).toBeInTheDocument();
  });

  it('markerar besökarens zon och kommer ihåg valet', () => {
    show('/satider/tomat');
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    expect(localStorage.getItem('odlingszon')).toBe('5');
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows[5]).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('link', { name: 'Google Kalender' }).getAttribute('href')).toContain('sakalender-zon-5.ics');
  });

  it('skickar nya besökare via registreringen till kalenderns planerare', () => {
    show('/satider/morot');
    const cta = screen.getByRole('link', { name: /Planera morötter i min kalender/ });
    const href = new URL(cta.getAttribute('href')!, 'https://odlingsdagboken.com');
    expect(href.pathname).toBe('/login');
    expect(href.searchParams.get('return')).toBe('/app/calendar');
    expect(href.searchParams.get('crop')).toBe('Morot');
    expect(href.searchParams.get('source')).toBe('satider');
  });

  it('tar inloggade direkt till planeraren med grödan förvald', () => {
    auth.isAuthenticated = true;
    show('/satider/morot');
    fireEvent.click(screen.getByRole('link', { name: /Planera morötter i min kalender/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/app/calendar{"planCrops":["Morot"],"zone":3}');
  });

  it('visar en hjälpsam 404 för okända grödor', () => {
    show('/satider/fikon');
    expect(screen.getByText('Grödan finns inte i såtiderna')).toBeInTheDocument();
  });
});

describe('/satider', () => {
  it('listar alla grödor per kategori med länkar', () => {
    show('/satider');
    expect(screen.getByRole('heading', { level: 1, name: /När ska man så\? Såtider för 44 grödor/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Såtider för tomat/ })).toHaveAttribute('href', '/satider/tomat');
    expect(screen.getByRole('heading', { level: 2, name: 'Bär' })).toBeInTheDocument();
  });
});

describe('avsikten "planera säsongen"', () => {
  it('leder till kalendern med grödan efter registrering', () => {
    const search = new URLSearchParams({ return: '/app/calendar', crop: 'Tomat', zone: '4' });
    expect(destinationFromSearch(search, null)).toEqual({ path: '/app/calendar', state: { planCrops: ['Tomat'], zone: 4 } });
    expect(navigationForIntent({ kind: 'plan-season', crops: ['Tomat'], returnTo: '/app/calendar' })).toEqual({ path: '/app/calendar', state: { planCrops: ['Tomat'] } });
  });

  it('behåller den gamla zonvägen', () => {
    const search = new URLSearchParams({ return: '/app/calendar', zone: '6' });
    expect(destinationFromSearch(search, null)).toEqual({ path: '/app/calendar', state: { zone: 6 } });
  });
});
