import { describe, expect, it } from 'vitest';
import { buildDigestModel } from '../../supabase/functions/_shared/weeklyDigestModel';

const profile = { user_id: 'u1', display_name: 'Anna Andersson', climate_zone: 3 };

describe('weekly digest model', () => {
  it('excludes finished sowings from active list', () => {
    const model = buildDigestModel({
      profile,
      sowings: [
        { variety: 'Tomat Sungold', status: 'done', sow_date: '2026-03-01' },
        { variety: 'Morot Napoli', status: 'transplanted', sow_date: '2026-04-01' },
      ],
      harvests: [],
      currentWeek: 31,
    });
    expect(model.activeSowings.map((s) => s.variety)).toEqual(['Morot Napoli']);
  });

  it('only suggests harvest for crops the user actually sowed', () => {
    const model = buildDigestModel({
      profile,
      sowings: [{ variety: 'Morot Napoli', status: 'transplanted', sow_date: '2026-04-01' }],
      harvests: [],
      currentWeek: 31,
    });
    expect(model.soonHarvest).toContain('Morot');
    expect(model.soonHarvest).not.toContain('Tomat');
  });

  it('ignores ornamental sowings for harvest suggestions', () => {
    const model = buildDigestModel({
      profile,
      sowings: [{ variety: 'Dahlia Café au Lait', status: 'flowering', plant_kind: 'ornamental' }],
      harvests: [],
      currentWeek: 31,
    });
    expect(model.soonHarvest).toEqual([]);
  });
});
