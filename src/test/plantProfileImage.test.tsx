import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import PlantProfileImage from '@/components/PlantProfileImage';
import { getPlantImage } from '@/lib/plantProfileData';

afterEach(cleanup);

describe('plant profile photos', () => {
  it('shows a local botanical placeholder for catalog photos confirmed unavailable', () => {
    for (const name of ['Basilika', 'Basilika (inne)', 'Chili', 'Dill', 'Fredslilja', 'Olivträd (kruka)', 'Persilja', 'Persilja (inne)', 'Potatis', 'Sötpotatis', 'Sockerärta', 'Svärmorstunga']) {
      expect(getPlantImage(name)).toBeNull();
    }
    render(<PlantProfileImage src={getPlantImage('Potatis')} name="Potatis" />);
    expect(screen.getByText('Bild saknas för Potatis')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('keeps a working photo and replaces it only if the image fails', () => {
    const src = getPlantImage('Tomat');
    const view = render(<PlantProfileImage src={src} name="Tomat" />);
    expect(screen.getByRole('img', { name: 'Tomat' })).toHaveAttribute('src', src);
    fireEvent.error(screen.getByRole('img', { name: 'Tomat' }));
    expect(screen.getByText('Bild saknas för Tomat')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();

    view.rerender(<PlantProfileImage src={getPlantImage('Gurka')} name="Gurka" />);
    expect(screen.getByRole('img', { name: 'Gurka' })).toHaveAttribute('src', getPlantImage('Gurka'));
    expect(screen.queryByText('Bild saknas för Tomat')).not.toBeInTheDocument();
  });
});
