// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { handleCalendarFeed, sha256Hex, stockholmDateKey, type FeedDeps } from '../../supabase/functions/_shared/calendarFeed';
import { bundleCalendarFeed, OUTPUT_PATH } from '../../scripts/export-calendar-feed.mjs';

const TOKEN = 'a'.repeat(64);
const url = (token = TOKEN) => `https://example.supabase.co/functions/v1/calendar-feed?token=${token}`;

function deps(overrides: Partial<FeedDeps> = {}): FeedDeps {
  return {
    resolveOwner: vi.fn(async () => 'user-1'),
    loadGarden: vi.fn(async () => ({
      zone: 3,
      sowings: [{ id: 's1', variety: 'Tomat – Sungold', sow_date: '2026-03-23', type: 'indoor', status: 'indoor', crop_key: 'tomat', beds: { name: 'Växthuset' } }],
      harvests: [{ id: 'h1', variety: 'Tomat – Sungold', harvest_date: '2026-08-20', weight_grams: 1200 }],
      reminders: [{ id: 'r1', title: 'Beställ fröer', date: '2026-02-01', done: false }],
    })),
    now: () => new Date('2026-04-01T10:00:00Z'),
    ...overrides,
  };
}

describe('calendar-feed', () => {
  it('den genererade kopian av kalenderlogiken är aktuell', async () => {
    const committed = await readFile(OUTPUT_PATH, 'utf8');
    expect(committed, 'Kör: node scripts/export-calendar-feed.mjs').toBe(await bundleCalendarFeed());
  });

  it('slår upp länken via hash och returnerar en prenumererbar iCal-fil', async () => {
    const d = deps();
    const response = await handleCalendarFeed(new Request(url()), d);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/calendar; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('private, max-age=900');
    expect(d.resolveOwner).toHaveBeenCalledWith(await sha256Hex(TOKEN));
    expect(d.loadGarden).toHaveBeenCalledWith('user-1');
    const body = await response.text();
    expect(body).toContain('X-WR-CALNAME:Odlingsdagboken – zon 3');
    expect(body).toContain('REFRESH-INTERVAL;VALUE=DURATION:PT6H');
    expect(body).toContain('SUMMARY:Sådde Tomat – Sungold');
    expect(body).toContain('SUMMARY:Plantera ut Tomat – Sungold');
    expect(body).toContain('SUMMARY:Skördade Tomat – Sungold');
    expect(body).toContain('SUMMARY:Beställ fröer');
  });

  it('ger samma 404 för felformaterad, okänd och avstängd länk', async () => {
    const unknown = deps({ resolveOwner: vi.fn(async () => null) });
    for (const [request, d] of [
      [new Request(url('kort')), deps()],
      [new Request('https://example.supabase.co/functions/v1/calendar-feed'), deps()],
      [new Request(url()), unknown],
    ] as const) {
      const response = await handleCalendarFeed(request, d);
      expect(response.status).toBe(404);
      expect(await response.text()).toBe('Kalenderlänken finns inte eller har stängts av.');
      expect(d.loadGarden).not.toHaveBeenCalled();
    }
  });

  it('svarar på HEAD utan innehåll och nekar andra metoder', async () => {
    const head = await handleCalendarFeed(new Request(url(), { method: 'HEAD' }), deps());
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
    const post = await handleCalendarFeed(new Request(url(), { method: 'POST' }), deps());
    expect(post.status).toBe(405);
  });

  it('använder svensk tid för "idag"', () => {
    expect(stockholmDateKey(new Date('2026-06-30T22:30:00Z'))).toBe('2026-07-01');
  });
});
