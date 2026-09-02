import { describe, expect, it } from 'vitest';
import { plantCtaCrop, readPrerenderBoot } from '@/lib/prerenderBoot';

describe('plant CTA survives JS takeover', () => {
  it('prefers the live plant name', () => {
    expect(plantCtaCrop({ name: 'Ärta' }, { plantName: 'ärta', slug: 'arta' }, 'arta')).toBe('Ärta');
  });

  it('keeps the prerendered name while the slug query is still loading', () => {
    expect(plantCtaCrop(null, { plantName: 'ärta', slug: 'arta' }, 'arta')).toBe('ärta');
    expect(plantCtaCrop(undefined, { plantName: 'ärta', slug: 'arta' }, 'arta')).toBe('ärta');
  });

  it('does not use another page boot payload', () => {
    expect(plantCtaCrop(null, { plantName: 'Tomat', slug: 'tomat' }, 'arta')).toBeUndefined();
  });

  it('reads window boot when present', () => {
    window.__OD_PRERENDER__ = { route: '/vaxter/arta', plantName: 'ärta', slug: 'arta' };
    expect(readPrerenderBoot()?.plantName).toBe('ärta');
    delete window.__OD_PRERENDER__;
    expect(readPrerenderBoot()).toBeNull();
  });
});
