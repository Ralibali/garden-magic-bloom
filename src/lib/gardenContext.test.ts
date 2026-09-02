import { describe, expect, it } from 'vitest';
import { getGardenContext } from './gardenContext';

describe('getGardenContext', () => {
  const sowings = [
    { id: 's1', variety: 'Tomat – Sungold', bed_id: 'b1', status: 'transplanted', sow_date: '2026-03-01' },
    { id: 's2', variety: 'Morot', bed_id: 'b2', status: 'sown', sow_date: '2026-04-01' },
  ];

  it('TODAY includes open due reminders and active sowings', () => {
    const context = getGardenContext({
      scope: 'TODAY',
      today: '2026-06-01',
      sowings,
      reminders: [
        { id: 'r1', title: 'Gallra', date: '2026-05-30', done: false, sowing_id: 's1', bed_id: 'b1' },
        { id: 'r2', title: 'Senare', date: '2026-06-10', done: false },
        { id: 'r3', title: 'Klar', date: '2026-05-01', done: true },
      ],
    });
    expect(context.items.some((item) => item.id === 'r1' && item.sowing_id === 's1')).toBe(true);
    expect(context.items.some((item) => item.id === 'r2')).toBe(false);
    expect(context.items.some((item) => item.id === 'r3')).toBe(false);
    expect(context.items.filter((item) => item.kind === 'sowing')).toHaveLength(2);
  });

  it('CROP scope groups by crop_key without dumping harvests', () => {
    const context = getGardenContext({
      scope: 'CROP',
      sowings,
      harvests: [{ id: 'h1', variety: 'Tomat – Sungold', harvest_date: '2026-08-01', sowing_id: 's1' }],
      focus: { cropKey: 'tomat' },
    });
    expect(context.items).toHaveLength(1);
    expect(context.items[0].crop_key).toBe('tomat');
    expect(context.items[0].variety_name).toBe('Sungold');
  });

  it('BED / SOWING / PROBLEM / SEED stay scoped', () => {
    const bed = getGardenContext({
      scope: 'BED',
      beds: [{ id: 'b1', name: 'Växthus' }, { id: 'b2', name: 'Friland' }],
      focus: { bedId: 'b1' },
    });
    expect(bed.items).toHaveLength(1);
    expect(bed.items[0].display_text).toBe('Växthus');

    const sowing = getGardenContext({
      scope: 'SOWING',
      sowings,
      focus: { sowingId: 's2' },
    });
    expect(sowing.items).toHaveLength(1);
    expect(sowing.items[0].crop_key).toBe('morot');

    const problem = getGardenContext({
      scope: 'PROBLEM',
      pests: [
        { id: 'p1', pest_name: 'bladlus', observed_date: '2026-06-01', sowing_id: 's1', resolved: false },
        { id: 'p2', pest_name: 'klar', observed_date: '2026-05-01', resolved: true },
      ],
    });
    expect(problem.items.map((item) => item.id)).toEqual(['p1']);

    const seed = getGardenContext({
      scope: 'SEED',
      seeds: [{ id: 'seed-1', variety: 'Tomat – Sungold', brand: 'Runåbergs' }],
    });
    expect(seed.items[0].identity?.crop_key).toBe('tomat');
  });
});
