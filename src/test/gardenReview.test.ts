import { describe, expect, it } from 'vitest';
import { parsePublicPlan } from '@/lib/publicPlan';
import { formatKg } from '@/lib/formatNumber';
import { cropPricesFromPreferences, pricePerKgFor, valueForHarvest } from '@/data/cropPrices';
import { profileAccess, subscriptionLabel } from '@/lib/subscriptionStatus';
import { signupConfirmationUrl } from '../../supabase/functions/_shared/signupConfirmation';

describe('Garden Bloom review regressions', () => {
  it('keeps unknown location and method unknown, including an Odlingsakuten result', () => {
    expect(parsePublicPlan({ type: 'odlingsakuten', crop: 'Tomat' })).toMatchObject({ zone: null, method: '', crops: ['Tomat'] });
    expect(parsePublicPlan({ type: 'sakalender', zone: '3oops' })?.zone).toBeNull();
  });
  it('formats 120 grams consistently without losing precision', () => {
    expect(formatKg(120 / 1000)).toBe('0,12');
    expect(formatKg(1)).toBe('1,00');
  });
  it('shares custom crop prices across varieties and preserves zero prices', () => {
    expect(valueForHarvest('Morot Nantes', 120, { morot: 25 })).toBe(3);
    expect(pricePerKgFor('Morötter', { morot: 0 })).toBe(0);
    expect(pricePerKgFor('Vitlök')).toBe(160);
    expect(pricePerKgFor('Vitlök', { lök: 5 })).toBe(160);
    expect(cropPricesFromPreferences({ crop_prices: { morot: 18, tomat: -1, gurka: '20' } })).toEqual({ morot: 18 });
  });
  it('distinguishes automatic trial, grant, expired access and paid membership', () => {
    const now = Date.parse('2026-10-07');
    const trial = profileAccess({ subscription_status: 'premium', created_at: '2026-10-01', premium_expires_at: '2026-10-15' }, now);
    expect(trial).toMatchObject({ subscribed: true, access_type: 'trial', can_manage_subscription: false });
    expect(subscriptionLabel({ ...trial, is_premium: true })).toBe('Plus – provperiod');
    expect(profileAccess({ subscription_status: 'premium', created_at: '2026-10-01', premium_expires_at: '2026-11-01' }, now).access_type).toBe('granted');
    expect(profileAccess({ subscription_status: 'premium', premium_expires_at: '2026-10-06' }, now).subscribed).toBe(false);
    expect(subscriptionLabel({ is_premium: true, access_type: 'stripe' })).toBe('Plus-medlem');
  });
  it('puts signup tokens on the owned domain in a fragment and rejects other origins/actions', () => {
    const project = 'https://example.supabase.co';
    const url = new URL(signupConfirmationUrl(`${project}/auth/v1/verify?token=test-hash&type=signup&redirect_to=https://evil.test`, project));
    expect(url.origin).toBe('https://odlingsdagboken.com');
    expect(url.pathname).toBe('/auth/confirm');
    expect(url.search).toBe('');
    expect(new URLSearchParams(url.hash.slice(1)).get('token_hash')).toBe('test-hash');
    expect(() => signupConfirmationUrl('https://evil.test/auth/v1/verify?token=x&type=signup', project)).toThrow();
    expect(() => signupConfirmationUrl(`${project}/auth/v1/verify?token=x&type=recovery`, project)).toThrow();
  });
});
