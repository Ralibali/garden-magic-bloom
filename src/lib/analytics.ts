import { supabase } from '@/integrations/supabase/client';

type AnalyticsMetadata = Record<string, unknown>;

const ANON_KEY = 'odlingsdagboken_anonymous_id';

export function getAnonymousId() {
  try {
    const existing = localStorage.getItem(ANON_KEY);
    if (existing) return existing;
    const generated = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(ANON_KEY, generated);
    return generated;
  } catch {
    return undefined;
  }
}

export async function trackEvent(eventName: string, metadata: AnalyticsMetadata = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      event_name: eventName,
      anonymous_id: getAnonymousId(),
      user_id: user?.id ?? null,
      email: user?.email ?? (localStorage.getItem('odlingsdagboken_lead_email') || null),
      page_path: window.location.pathname,
      source: typeof metadata.source === 'string' ? metadata.source : new URLSearchParams(window.location.search).get('source'),
      metadata,
      user_agent: navigator.userAgent,
    };
    const { error } = await supabase.from('analytics_events' as any).insert(payload as any);
    if (error) throw error;
  } catch (error) {
    console.warn('[trackEvent]', eventName, error);
  }
}

export async function markLeadConverted(email: string, userId: string) {
  if (!email || !userId) return;
  try {
    await supabase.rpc('mark_public_leads_converted' as any, { _email: email.toLowerCase(), _user_id: userId } as any);
    await trackEvent('lead_converted_to_user', { email: email.toLowerCase() });
  } catch (error) {
    console.warn('[markLeadConverted]', error);
  }
}
