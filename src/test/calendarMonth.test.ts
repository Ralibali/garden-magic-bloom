import { describe, expect, it } from 'vitest';
import { getMonthActivities } from '@/lib/calendarMonth';
import { getWinterTasks } from '@/data/winterTasks';
import { sowingMatrix } from '@/data/sowingMatrix';

describe('getMonthActivities', () => {
  it('ger olika resultat för mars i zon 1 och zon 8', () => {
    const zone1 = getMonthActivities(3, 1);
    const zone8 = getMonthActivities(3, 8);
    const names = (list: { name: string }[]) => list.map(c => c.name).join(',');
    expect(names(zone1.forodla)).not.toEqual(names(zone8.forodla));
    // I zon 1 är sista frost v.16 – mars ligger nära utplantering och direktsådd.
    expect(zone1.direktsa.length).toBeGreaterThan(zone8.direktsa.length);
  });

  it('har grödor i varje aktivitetssektion under högsäsong', () => {
    const june = getMonthActivities(6, 3);
    expect(june.direktsa.length).toBeGreaterThan(0);
    expect(june.skorda.length).toBeGreaterThan(0);
    expect(june.totalCrops).toBeGreaterThan(5);
  });

  it('faller tillbaka på vintersysslor när inget sås', () => {
    const january = getMonthActivities(1, 5);
    expect(january.other.length).toBeGreaterThan(1);
  });

  it('klamrar månad och zon till giltiga värden', () => {
    expect(getMonthActivities(0, 0).month).toBe(1);
    expect(getMonthActivities(0, 0).zone).toBe(1);
    expect(getMonthActivities(99, 99).month).toBe(12);
    expect(getMonthActivities(99, 99).zone).toBe(8);
  });

  it('anger vecknummer som stiger med kallare zon', () => {
    const findWeek = (zone: number) => {
      const data = getMonthActivities(5, zone);
      return data.planteraUt.find(c => c.name === 'Tomat')?.startWeek
        ?? getMonthActivities(6, zone).planteraUt.find(c => c.name === 'Tomat')?.startWeek
        ?? 0;
    };
    expect(findWeek(8)).toBeGreaterThan(findWeek(1));
  });
});

describe('sowingMatrix', () => {
  it('innehåller minst 35 grödor med tider i alla åtta zoner', () => {
    expect(sowingMatrix.length).toBeGreaterThanOrEqual(35);
    for (const crop of sowingMatrix) {
      for (let z = 1; z <= 8; z++) {
        expect(crop.zones[z], `${crop.name} zon ${z}`).toBeTruthy();
      }
    }
  });
});

describe('getWinterTasks', () => {
  it('skjuter väderberoende sysslor framåt i kalla zoner', () => {
    const feb1 = getWinterTasks(2, 1).map(t => t.title);
    const mar8 = getWinterTasks(3, 8).map(t => t.title);
    expect(feb1).toContain('Förodla chili och paprika');
    expect(mar8).toContain('Förodla chili och paprika');
    expect(getWinterTasks(2, 8).map(t => t.title)).not.toContain('Förodla chili och paprika');
  });
});
