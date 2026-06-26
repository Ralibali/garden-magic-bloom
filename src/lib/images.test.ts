import { describe, expect, it } from 'vitest';
import { approximateDataUrlBytes, isImageDataUrl } from './images';

describe('image helpers', () => {
  it('accepts supported image data URLs', () => {
    expect(isImageDataUrl('data:image/jpeg;base64,AAAA')).toBe(true);
    expect(isImageDataUrl('data:image/png;base64,AAAA')).toBe(true);
    expect(isImageDataUrl('data:text/plain;base64,AAAA')).toBe(false);
  });

  it('estimates decoded bytes from base64 payloads', () => {
    expect(approximateDataUrlBytes('data:image/jpeg;base64,AAAA')).toBe(3);
    expect(approximateDataUrlBytes('data:image/jpeg;base64,')).toBe(0);
  });
});
