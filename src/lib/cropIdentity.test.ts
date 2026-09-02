import { describe, expect, it } from 'vitest';
import { deriveCropIdentity, identityFromSowing, UNKNOWN_CROP_KEY } from './cropIdentity';

describe('deriveCropIdentity', () => {
  it('splits catalogue crop and custom variety without rewriting display text', () => {
    const identity = deriveCropIdentity('Tomat – Sungold');
    expect(identity.crop_key).toBe('tomat');
    expect(identity.variety_name).toBe('Sungold');
    expect(identity.display_text).toBe('Tomat – Sungold');
    expect(identity.source).toBe('custom');
  });

  it('matches aliases and keeps custom names', () => {
    expect(deriveCropIdentity('Cherry tomato Sungold').crop_key).toBe('tomat');
    expect(deriveCropIdentity('Sungold').crop_key).toBe('tomat');
    expect(deriveCropIdentity('Sungold').variety_name).toBe('Sungold');
    expect(deriveCropIdentity('Rödbetor').crop_key).toBe('rodbeta');
  });

  it('returns UNKNOWN for unrecognised text', () => {
    const identity = deriveCropIdentity('Mormors hemliga sort');
    expect(identity.crop_key).toBe(UNKNOWN_CROP_KEY);
    expect(identity.variety_name).toBe('Mormors hemliga sort');
    expect(identity.source).toBe('unknown');
  });

  it('treats empty input as unknown without inventing a crop', () => {
    expect(deriveCropIdentity('').crop_key).toBe(UNKNOWN_CROP_KEY);
    expect(deriveCropIdentity(null).display_text).toBe('');
  });
});

describe('identityFromSowing', () => {
  it('prefers stored crop_key over a lazy parse', () => {
    const identity = identityFromSowing({
      variety: 'Weird label',
      crop_key: 'tomat',
      variety_name: 'Sungold',
    });
    expect(identity.crop_key).toBe('tomat');
    expect(identity.variety_name).toBe('Sungold');
    expect(identity.display_text).toBe('Weird label');
  });

  it('falls back to parsing when columns are empty (old rows)', () => {
    expect(identityFromSowing({ variety: 'Morot Napoli' }).crop_key).toBe('morot');
  });
});
