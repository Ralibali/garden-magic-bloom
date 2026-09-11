import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import AnnonsCta from '@/components/AnnonsCta';
import { DIN_TRADGARD_MAJ_ANNONS } from '@/lib/annonsOffers';

describe('AnnonsCta', () => {
  it('renders the disclosed sponsored link with the exact READY copy', () => {
    render(
      <AnnonsCta
        href={DIN_TRADGARD_MAJ_ANNONS.href}
        disclosure={DIN_TRADGARD_MAJ_ANNONS.disclosure}
        disclosureLine={DIN_TRADGARD_MAJ_ANNONS.disclosureLine}
        linkText={DIN_TRADGARD_MAJ_ANNONS.linkText}
        floor={DIN_TRADGARD_MAJ_ANNONS.floor}
        rel={DIN_TRADGARD_MAJ_ANNONS.rel}
      />,
    );
    expect(screen.getAllByText('Annons').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Affiliatelänkar till Din trädgård.')).toBeTruthy();
    expect(screen.getByText(DIN_TRADGARD_MAJ_ANNONS.floor)).toBeTruthy();
    const link = screen.getByRole('link', { name: /Nät, stöd och redskap i maj/i });
    expect(link.getAttribute('href')).toBe('https://addrevenue.io/t?a=985743&c=3467735');
    expect(link.getAttribute('rel')).toBe('sponsored noopener noreferrer');
    expect(link.getAttribute('target')).toBe('_blank');
  });
});
