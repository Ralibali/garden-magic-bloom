import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ native: false, from: vi.fn(), insert: vi.fn() }));
vi.mock('@/lib/native', () => ({ isNativeApp: () => mocks.native }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
import { logAffiliateClick } from './affiliateTracking';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.native = false;
  mocks.from.mockReturnValue({ insert: mocks.insert });
  mocks.insert.mockResolvedValue({ error: null });
});

describe('affiliate click measurement', () => {
  it('never writes click events in the native app', async () => {
    mocks.native = true;
    await logAffiliateClick('product-1', 'gro-suggestion');
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('preserves the existing website event', async () => {
    await logAffiliateClick('product-1', 'gro-suggestion');
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith('click_events');
    expect(mocks.insert).toHaveBeenCalledExactlyOnceWith({
      event_name: 'affiliate_click',
      path: 'gro-suggestion/product-1',
      metadata: { product_id: 'product-1', placement: 'gro-suggestion' },
    });
  });
});
