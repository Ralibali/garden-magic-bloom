import { describe, expect, it } from 'vitest';
import { calendarLink, calendarStartingPoint, readCalendarLink } from '@/lib/calendarLink';

describe('portable sowing calendars', () => {
  it('restores selected varieties, season and zone in a fresh browser', () => {
    const { plan } = calendarStartingPoint(new URLSearchParams('crop=Tomat&crop=Rädisa&zone=6'), '');
    plan.varieties = { 'Rädisa': 'Röd jätte', Tomat: 'Sungold F1' };
    plan.season = 2027;
    const link = new URL(calendarLink(plan, 'butik-1'));
    expect(readCalendarLink(link.hash)).toEqual(plan);
    expect(calendarStartingPoint(link.searchParams, link.hash).showResult).toBe(true);
    expect(link.search).toBe('?via=butik-1');
  });
  it('preserves old crop links and lets a recipient change the raised bed preset', () => {
    expect(calendarStartingPoint(new URLSearchParams('crop=tomat'), '').plan.crops).toEqual(['Tomat']);
    const preset = calendarStartingPoint(new URLSearchParams('mall=pallkrage-120x80'), '');
    expect(preset.showResult).toBe(false);
    expect(preset.plan.crops).toContain('Dill');
    expect(readCalendarLink('#plan=invalid')).toBeNull();
  });
});
