import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PUBLIC_NAV } from '@/components/PublicLayout';
import Funktioner from '@/pages/Funktioner';
import HurDetFungerar from '@/pages/HurDetFungerar';
import AddPlantCta from '@/components/AddPlantCta';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false, loading: false, user: null }),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

function wrap(ui: ReactElement, path: string) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </HelmetProvider>,
  );
}

describe('standalone marketing routes (hydrate must not 404)', () => {
  it('keeps nav on real paths, not homepage hashes', () => {
    const how = PUBLIC_NAV.find((item) => item.label === 'Hur det fungerar');
    const features = PUBLIC_NAV.find((item) => item.label === 'Funktioner');
    expect(how?.to).toBe('/hur-det-fungerar');
    expect(features?.to).toBe('/funktioner');
    expect(how?.to).not.toContain('#');
    expect(features?.to).not.toContain('#');
  });

  it('registers /funktioner and /hur-det-fungerar as router paths', () => {
    const app = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8');
    expect(app).toContain('path="/funktioner"');
    expect(app).toContain('path="/hur-det-fungerar"');
    expect(app).toContain('element={<Funktioner />}');
    expect(app).toContain('element={<HurDetFungerar />}');
  });

  it('renders unique Funktioner H1 — not the 404 title', () => {
    wrap(<Funktioner />, '/funktioner');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Funktioner som gör odlingen lättare att minnas',
    );
    expect(screen.queryByText('Sidan hittades inte')).toBeNull();
  });

  it('renders unique Hur det fungerar H1 — not the 404 title', () => {
    wrap(<HurDetFungerar />, '/hur-det-fungerar');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Så fungerar Odlingsdagboken i praktiken',
    );
    expect(screen.queryByText('Sidan hittades inte')).toBeNull();
  });

  it('shows plant CTA copy and a real register href', () => {
    wrap(<AddPlantCta crop="Morot" slug="morot" />, '/vaxter/morot');
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Lägg till Morot i min odling');
    const link = screen.getByRole('link', { name: /lägg till morot/i });
    expect(link.getAttribute('href')).toContain('/login');
    expect(link.getAttribute('href')).toContain('crop=Morot');
  });
});
