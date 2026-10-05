import { describe, expect, it } from 'vitest';
import { buildDigestModel } from '../../supabase/functions/_shared/weeklyDigestModel';
import { dayLabel, renderDigestHtml } from '../../supabase/functions/_shared/weeklyDigestHtml';

const profile = { user_id: 'u1', display_name: 'Anna <b>Andersson</b>', climate_zone: 3 };

describe('veckomejlets HTML', () => {
  it('visar kalendern, påminnelser och länkade grödor på svenska', () => {
    const model = buildDigestModel({
      profile,
      sowings: [{ id: 's1', variety: 'Tomat – Sungold', crop_key: 'tomat', status: 'indoor', type: 'indoor', sow_date: '2026-03-23' }],
      harvests: [],
      today: '2026-04-01',
      currentWeek: 14,
      currentDate: new Date('2026-04-01T08:00:00Z'),
      reminderItems: [{ id: 'r', title: 'Köp såjord & krukor', date: '2026-04-03' }, { id: 'o', title: 'Försenad', date: '2026-03-30' }],
    });
    const html = renderDigestHtml(model);
    expect(html).toContain('Hej Anna!');
    expect(html).toContain('<h2 style="font-size:18px; margin:22px 0 6px; color:#16351f;">Dina påminnelser</h2>');
    expect(html).toContain('Köp såjord &amp; krukor – fredag 3 apr');
    expect(html).toContain('1 påminnelse är försenad');
    expect(html).toContain('<a href="https://odlingsdagboken.com/satider/tomat" style="color:#2f6b3d;">Tomat</a> <strong style="color:#b91c1c;">– sista veckan</strong>');
    expect(html).toContain('Tomat – Sungold – förodlas');
    expect(html).not.toContain('indoor');
    expect(html).toContain('href="https://odlingsdagboken.com/app/calendar"');
  });

  it('skriver vikter med svensk decimal', () => {
    const model = buildDigestModel({ profile, sowings: [], harvests: [{ variety: 'Rädisa', harvest_date: '2026-05-10', weight_grams: 400 }], today: '2026-05-14', currentDate: new Date('2026-05-14T08:00:00Z') });
    expect(renderDigestHtml(model)).toContain('0,4 kg registrerad skörd i år');
  });

  it('formaterar dagar på svenska', () => {
    expect(dayLabel('2026-05-18')).toBe('måndag 18 maj');
  });
});
