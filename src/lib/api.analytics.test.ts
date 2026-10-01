import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), insert: vi.fn(), single: vi.fn(), isNativeApp: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: () => ({ insert: mocks.insert }),
  },
}));
vi.mock('@/lib/native', () => ({ isNativeApp: mocks.isNativeApp, assertWebPurchase: vi.fn() }));

let api: typeof import('./api');
let runtime: typeof import('./ga4Runtime');
const originalPush = history.pushState;
const originalReplace = history.replaceState;
const events = () => (window as unknown as { dataLayer: ArrayLike<unknown>[] }).dataLayer
  .map(row => Array.from(row)).filter(row => row[0] === 'event' && row[1] !== 'page_view');
const sowing = { variety: 'PRIVATE_CROP', notes: 'PRIVATE_NOTE', bed_id: 'PRIVATE_BED', sow_date: '2026-10-01', type: 'direct' };
const harvest = { variety: 'PRIVATE_CROP', notes: 'PRIVATE_NOTE', sowing_id: 'PRIVATE_SOWING', harvest_date: '2026-10-01', weight_grams: 123 };
const cases = [
  { event: 'sowing_created', save: () => api.createSowing(sowing) },
  { event: 'harvest_created', save: () => api.createHarvest(harvest) },
];

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.isNativeApp.mockReturnValue(false);
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'PRIVATE_USER' } } });
  mocks.insert.mockReturnValue({ select: () => ({ single: mocks.single }) });
  mocks.single.mockResolvedValue({ data: { id: 'PRIVATE_RECORD' }, error: null });
  history.pushState = originalPush;
  history.replaceState = originalReplace;
  history.replaceState({}, '', '/app/sowings?private=value');
  document.head.querySelectorAll('script').forEach(el => el.remove());
  localStorage.clear();
  delete (window as unknown as { gtag?: unknown }).gtag;
  (window as unknown as { dataLayer: unknown[] }).dataLayer = [];
  runtime = await import('./ga4Runtime');
  runtime.initGa4({ measurementId: 'G-TEST123456', hosts: [location.hostname], excluded: ['/app/admin', '/admin'], consentKey: 'api-test' });
  api = await import('./api');
});
afterEach(() => { history.pushState = originalPush; history.replaceState = originalReplace; });

describe.each(cases)('$event after saving', ({ event, save }) => {
  it('sends exactly one event after a confirmed insert, with no record or personal data', async () => {
    runtime.setAnalyticsConsent(true);
    let resolveInsert: (value: unknown) => void;
    mocks.single.mockImplementationOnce(() => new Promise(resolve => { resolveInsert = resolve; }));
    const result = save();
    await vi.waitFor(() => expect(mocks.single).toHaveBeenCalledOnce());
    expect(events()).toEqual([]);
    resolveInsert!({ data: { id: 'PRIVATE_RECORD' }, error: null });
    await expect(result).resolves.toEqual({ id: 'PRIVATE_RECORD' });
    expect(events().map(row => row[1])).toEqual([event]);
    expect(events()[0][2]).toMatchObject({ page_location: `${location.origin}/app/sowings`, page_title: '/app/sowings' });
    expect(JSON.stringify(events())).not.toContain('private=value');
    expect(JSON.stringify(events())).not.toMatch(/PRIVATE_|variety|weight_grams|notes|sowing_id|bed_id|user_id/);
  });

  it('does not record a rejected insert', async () => {
    runtime.setAnalyticsConsent(true);
    mocks.single.mockResolvedValue({ data: null, error: { message: 'Save failed' } });
    await expect(save()).rejects.toThrow('Save failed');
    expect(events()).toEqual([]);
  });

  it('does not record a missing returned row', async () => {
    runtime.setAnalyticsConsent(true);
    mocks.single.mockResolvedValue({ data: null, error: null });
    await expect(save()).resolves.toBeNull();
    expect(events()).toEqual([]);
  });

  it('keeps saving available without consent and never replays the event', async () => {
    await expect(save()).resolves.toEqual({ id: 'PRIVATE_RECORD' });
    expect(events()).toEqual([]);
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
    runtime.setAnalyticsConsent(true);
    expect(events()).toEqual([]);
  });

  it('does not send native-app activity to browser analytics', async () => {
    runtime.setAnalyticsConsent(true);
    mocks.isNativeApp.mockReturnValue(true);
    await expect(save()).resolves.toEqual({ id: 'PRIVATE_RECORD' });
    expect(events()).toEqual([]);
  });

  it('does not record saves after consent is revoked', async () => {
    runtime.setAnalyticsConsent(true);
    runtime.setAnalyticsConsent(false);
    await save();
    expect(events()).toEqual([]);
  });
});
