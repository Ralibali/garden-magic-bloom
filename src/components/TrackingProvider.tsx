import { usePageTracking, useAutoClickTracking } from '@/hooks/useTracking';

export function TrackingProvider() {
  usePageTracking();
  useAutoClickTracking();
  return null;
}
