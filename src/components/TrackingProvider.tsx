import { useEffect, useState } from 'react';
import { usePageTracking, useAutoClickTracking, useScrollDepthTracking } from '@/hooks/useTracking';

function hasConsent(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem('cookie-consent') === 'accepted';
}

export function TrackingProvider() {
  const [consent, setConsent] = useState(hasConsent);

  useEffect(() => {
    const syncConsent = () => setConsent(hasConsent());
    window.addEventListener('storage', syncConsent);
    const timer = window.setInterval(syncConsent, 750);
    return () => {
      window.removeEventListener('storage', syncConsent);
      window.clearInterval(timer);
    };
  }, []);

  usePageTracking(consent);
  useAutoClickTracking(consent);
  useScrollDepthTracking(consent);
  return null;
}
