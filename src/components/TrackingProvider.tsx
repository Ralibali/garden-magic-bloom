import { usePageTracking, useAutoClickTracking, useScrollDepthTracking } from '@/hooks/useTracking';

function hasConsent(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem('cookie-consent') === 'accepted';
}

export function TrackingProvider() {
  const consent = hasConsent();
  usePageTracking(consent);
  useAutoClickTracking(consent);
  useScrollDepthTracking(consent);
  return null;
}
