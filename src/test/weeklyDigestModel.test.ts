import { describe, expect, it } from 'vitest';
import { buildDigestModel, getIsoWeek } from '../../supabase/functions/_shared/weeklyDigestModel';

describe('weekly digest model', () => {
  it('bygger innehåll för en användare med aktiv odling', () => {
    const model = buildDigestModel({
      currentDate: new Date('2026-05-10T12:00:00Z'),
      currentWeek: 20,
      profile: { user_id: 'user-1', display_name: 'Anna Odlare', climate_zone: 3 },
      sowings: [{ variety: 'Tomat', status: 'sådd', sow_date: '2026-04-01', transplant_date: '2026-05-14', type: 'förodling' }],
      harvests: [{ variety: 'Sallat', harvest_date: '2026-06-20', weight_grams: 1250 }],
      reminders: [{ title: 'Plantera ut Tomat', due_date: '2026-05-14' }],
      photoCountLastWeek: 2,
      forecastMinTemp: 1.5,
    });

    expect(model.hasContent).toBe(true);
    expect(model.firstName).toBe('Anna');
    expect(model.zone).toBe(3);
    expect(model.frostWarning).toBe(true);
    expect(model.activeSowings).toHaveLength(1);
    expect(model.harvestKg).toBe(1.3);
  });

  it('hoppar mejl när det saknas allt relevant innehåll', () => {
    const model = buildDigestModel({
      currentWeek: 1,
      profile: { user_id: 'user-1', climate_zone: 3 },
      sowings: [],
      harvests: [],
      reminders: [],
      photoCountLastWeek: 0,
      forecastMinTemp: 8,
    });

    expect(model.hasContent).toBe(false);
  });

  it('räknar ISO-vecka deterministiskt', () => {
    expect(getIsoWeek(new Date('2026-01-05T12:00:00Z'))).toEqual({ year: 2026, week: 2 });
  });
});
