import { usePageTracking, useAutoClickTracking, useScrollDepthTracking } from '@/hooks/useTracking';

export function TrackingProvider() {
  usePageTracking();
  useAutoClickTracking();
  useScrollDepthTracking();
  return null;
}
