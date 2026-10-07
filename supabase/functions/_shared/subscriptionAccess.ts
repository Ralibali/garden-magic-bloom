export type AccessType = 'free' | 'trial' | 'granted' | 'stripe' | 'stripe_trial' | 'unknown' | 'bundle';
export type AccessSummary = {
  subscribed: boolean;
  access_type: AccessType;
  subscription_end: string | null;
  can_manage_subscription: boolean | null;
  trial_end: string | null;
};
type Profile = { subscription_status?: string | null; premium_expires_at?: string | null; created_at?: string | null };

/** The signup trigger grants exactly 14 days; other grants must not be called trials. */
export function profileAccess(profile: Profile | null | undefined, now = Date.now()): AccessSummary {
  const expires = profile?.premium_expires_at ? Date.parse(profile.premium_expires_at) : null;
  const active = profile?.subscription_status === 'premium' && (expires === null || expires > now);
  const created = Date.parse(profile?.created_at || '');
  const isSignupTrial = active && expires !== null && Number.isFinite(created)
    && Math.abs(expires - created - 14 * 86400000) < 60000;
  return {
    subscribed: active,
    access_type: !active ? 'free' : isSignupTrial ? 'trial' : 'granted',
    subscription_end: active ? profile?.premium_expires_at ?? null : null,
    trial_end: isSignupTrial ? profile?.premium_expires_at ?? null : null,
    can_manage_subscription: false,
  };
}
