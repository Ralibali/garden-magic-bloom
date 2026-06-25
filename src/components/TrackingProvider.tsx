import { useEffect, useState } from 'react';
import { usePageTracking, useAutoClickTracking, useScrollDepthTracking } from '@/hooks/useTracking';

const CONSENT_EVENT = 'odlingsdagboken:consent';

function hasConsent(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem('cookie-consent') === 'accepted';
}

export function TrackingProvider() {
  const [consent, setConsent] = useState(hasConsent);

  useEffect(() => {
    const syncConsent = () => setConsent(hasConsent());
    window.addEventListener(CONSENT_EVENT, syncConsent);
    window.addEventListener('storage', syncConsent);
    return () => {
      window.removeEventListener(CONSENT_EVENT, syncConsent);
      window.removeEventListener('storage', syncConsent);
    };
  }, []);

  usePageTracking(consent);
  useAutoClickTracking(consent);
  useScrollDepthTracking(consent);
  return null;
}
