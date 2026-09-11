import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import AnnonsCta from '@/components/AnnonsCta';
import { DIN_TRADGARD_MAJ_ANNONS } from '@/lib/annonsOffers';

describe('AnnonsCta', () => {
  it('renders the disclosed sponsored link with the exact offer', () => {
    render(
      <AnnonsCta
        href={DIN_TRADGARD_MAJ_ANNONS.href}
        disclosure={DIN_TRADGARD_MAJ_ANNONS.disclosure}
        linkText={DIN_TRADGARD_MAJ_ANNONS.linkText}
        rel={DIN_TRADGARD_MAJ_ANNONS.rel}
      />,
    );
    expect(screen.getByText('Annons')).toBeTruthy();
    const link = screen.getByRole('link', { name: /Se trädgårdsprodukter hos Din trädgård/i });
    expect(link.getAttribute('href')).toBe('https://addrevenue.io/t?a=985743&c=3467735');
    expect(link.getAttribute('rel')).toBe('sponsored noopener noreferrer');
    expect(link.getAttribute('target')).toBe('_blank');
  });
});
