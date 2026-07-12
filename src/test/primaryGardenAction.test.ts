import { describe, expect, it } from 'vitest';
import { getPrimaryGardenAction } from '@/lib/primaryGardenAction';

describe('primary garden action', () => {
  it('starts with a place before asking for a sowing', () => {
    expect(getPrimaryGardenAction({ bedCount: 0, sowingCount: 0, month: 7 })).toMatchObject({
      kind: 'bed',
      path: '/app/beds',
    });
  });

  it('asks for the first sowing once a place exists', () => {
    expect(getPrimaryGardenAction({ bedCount: 1, sowingCount: 0, month: 7 })).toMatchObject({
      kind: 'sowing',
      label: 'Logga första sådden',
    });
  });

  it('prioritizes harvest during the Swedish harvest season', () => {
    expect(getPrimaryGardenAction({ bedCount: 2, sowingCount: 4, month: 8 })).toMatchObject({
      kind: 'harvest',
      path: '/app/harvests',
    });
  });

  it('prioritizes planning during winter', () => {
    expect(getPrimaryGardenAction({ bedCount: 2, sowingCount: 4, month: 1 })).toMatchObject({
      kind: 'calendar',
      path: '/app/calendar',
    });
  });
});
