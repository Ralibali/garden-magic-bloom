import { describe, expect, it } from 'vitest';
import { plantTiming } from './plantPresentation';
describe('plant guide timings', () => {
  it('uses the calendar for peas rather than the January placeholder', () => {
    const timing = plantTiming({ slug: 'arta', name: 'ärta', sow_indoor_start: 1 });
    expect(timing.sowIndoor).toBeNull();
    expect(timing.sowOutdoor).toBe('vecka 17–25');
  });
  it.each(['blabar', 'druva'])('models %s as planting a purchased plant', slug => {
    const timing = plantTiming({ slug, name: slug, sow_indoor_start: 3 });
    expect(timing.sowIndoor).toBeNull();
    expect(timing.sowOutdoor).toBeNull();
    expect(timing.plantingTime).toBeTruthy();
  });
});
