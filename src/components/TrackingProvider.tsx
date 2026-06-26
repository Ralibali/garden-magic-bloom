import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { usePageTracking, useAutoClickTracking, useScrollDepthTracking } from '@/hooks/useTracking';

const HEARTBEAT_KEY = 'odlingsdagboken_activity_heartbeat';

function hasConsent(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem('cookie-consent') === 'accepted';
}

export function TrackingProvider() {
  const [consent, setConsent] = useState(hasConsent);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const syncConsent = () => setConsent(hasConsent());
    window.addEventListener('storage', syncConsent);
    const timer = window.setInterval(syncConsent, 750);
    return () => {
      window.removeEventListener('storage', syncConsent);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const now = Date.now();
    const previous = Number(localStorage.getItem(HEARTBEAT_KEY) || 0);
    if (now - previous < 15 * 60 * 1000) return;
    localStorage.setItem(HEARTBEAT_KEY, String(now));

    const updateActivity = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();
      const preferences = profile?.preferences && typeof profile.preferences === 'object' && !Array.isArray(profile.preferences)
        ? profile.preferences as Record<string, unknown>
        : {};
      await supabase
        .from('profiles')
        .update({ preferences: { ...preferences, last_active_at: new Date().toISOString(), last_activity_path: location.pathname } } as any)
        .eq('user_id', user.id);
    };

    void updateActivity();
  }, [location.pathname, user?.id]);

  usePageTracking(consent);
  useAutoClickTracking(consent);
  useScrollDepthTracking(consent);
  return null;
}
