import { describe, expect, it } from 'vitest';
import { guessPlantKind, normalizePlantKind } from '@/lib/plantKind';
import { getSowingStatusOrder, nextSowingStatus, normalizeSowingStatus } from '@/lib/sowingLifecycle';

describe('plantKind', () => {
  it('detects ornamentals case-insensitively', () => {
    expect(guessPlantKind('Dahlia Café au Lait')).toBe('ornamental');
    expect(guessPlantKind('TULPAN Apeldoorn')).toBe('ornamental');
  });

  it('prefers the longest keyword match', () => {
    expect(guessPlantKind('Ringblomma')).toBe('ornamental');
  });

  it('defaults to edible', () => {
    expect(guessPlantKind('Tomat – Sungold')).toBe('edible');
    expect(guessPlantKind('')).toBe('edible');
    expect(guessPlantKind(null)).toBe('edible');
  });

  it('normalizes db values', () => {
    expect(normalizePlantKind('ornamental')).toBe('ornamental');
    expect(normalizePlantKind('nonsense')).toBe('edible');
  });
});

describe('ornamental lifecycle', () => {
  it('uses a flowering/overwintering lifecycle', () => {
    expect(getSowingStatusOrder('ornamental')).toEqual([
      'sown', 'indoor', 'transplanted', 'flowering', 'overwintering', 'done',
    ]);
  });

  it('never offers a harvesting step for ornamentals', () => {
    expect(nextSowingStatus('transplanted', 'ornamental')).toBe('flowering');
    expect(nextSowingStatus('flowering', 'ornamental')).toBe('overwintering');
    expect(nextSowingStatus('transplanted', 'edible')).toBe('harvesting');
  });

  it('maps cross-kind statuses to the closest valid step', () => {
    expect(normalizeSowingStatus('harvesting', 'ornamental')).toBe('flowering');
    expect(normalizeSowingStatus('flowering', 'edible')).toBe('harvesting');
    expect(normalizeSowingStatus('overwintering', 'edible')).toBe('done');
  });
});
