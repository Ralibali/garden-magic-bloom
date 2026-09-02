import { describe, expect, it } from 'vitest';
import { attachToSowing, harvestFromSowing, reminderFromSowing } from './sowingAttach';

const sowing = {
  id: 'sow-1',
  bed_id: 'bed-2',
  variety: 'Tomat – Sungold',
  beds: { name: 'Växthus bädd 2' },
};

describe('attachToSowing', () => {
  it('copies sowing_id and bed_id when a sowing exists', () => {
    expect(attachToSowing(sowing)).toEqual({
      sowing_id: 'sow-1',
      bed_id: 'bed-2',
      variety: 'Tomat – Sungold',
      display_text: 'Tomat – Sungold',
      source: 'sowing',
    });
  });

  it('allows bed-only or garden-level rows', () => {
    expect(attachToSowing(null, { bed_id: 'bed-9', source: 'bed' })).toMatchObject({
      sowing_id: null,
      bed_id: 'bed-9',
      source: 'bed',
    });
  });
});

describe('typed helpers', () => {
  it('builds a reminder that survives a bed rename', () => {
    const reminder = reminderFromSowing(sowing, {
      title: 'Gallra Sungold',
      type: 'other',
      date: '2026-06-01',
    });
    expect(reminder.sowing_id).toBe('sow-1');
    expect(reminder.bed_id).toBe('bed-2');
    expect(reminder.display_text).toBe('Gallra Sungold');
  });

  it('builds a harvest from the sowing instead of retyping variety', () => {
    const harvest = harvestFromSowing(sowing, { harvest_date: '2026-08-01', weight_grams: 350 });
    expect(harvest.sowing_id).toBe('sow-1');
    expect(harvest.variety).toBe('Tomat – Sungold');
    expect(harvest.bed_id).toBe('bed-2');
  });
});
