import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

function getSessionId(): string {
  let id = sessionStorage.getItem('_sid');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('_sid', id);
  }
  return id;
}

function getDeviceType(): string {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

/** Track page views on route change */
export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;

    supabase.from('page_views').insert({
      path,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      session_id: getSessionId(),
      device_type: getDeviceType(),
    } as any).then(() => {});
  }, [location.pathname]);
}

const CTA_KEYWORDS = new Set([
  'kom igång', 'skapa konto', 'registrera', 'logga in', 'uppgradera',
  'köp', 'testa gratis', 'prova', 'ladda ner', 'boka', 'prenumerera',
  'läs mer', 'visa mer', 'börja nu', 'starta', 'prova plus',
]);

function isCta(text: string): boolean {
  const lower = text.toLowerCase().trim();
  for (const kw of CTA_KEYWORDS) {
    if (lower.includes(kw)) return true;
  }
  return false;
}

/** Fire gtag conversion event */
function trackConversion(eventName: string, label?: string) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'conversion', {
      send_to: 'AW-10941540384',
      event_category: 'engagement',
      event_label: label || eventName,
    });
  }
}

/** Auto-track clicks on links, buttons, and interactive elements */
export function useAutoClickTracking() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      let el = e.target as HTMLElement | null;
      let depth = 0;

      while (el && depth < 6) {
        const tag = el.tagName?.toLowerCase();
        const role = el.getAttribute('role');
        if (tag === 'a' || tag === 'button' || role === 'button' || role === 'link' || role === 'menuitem') break;
        el = el.parentElement;
        depth++;
      }

      if (!el) return;

      const tag = el.tagName.toLowerCase();
      const text = (el.textContent || '').trim().slice(0, 80);
      const href = el.getAttribute('href') || '';
      const trackId = el.getAttribute('data-track') || el.id || '';
      const ctaMatch = isCta(text);

      let eventName = 'button_click';
      if (ctaMatch) {
        eventName = 'cta_click';
        // Track CTA clicks as conversions
        if (text.toLowerCase().includes('skapa') || text.toLowerCase().includes('kom igång') || text.toLowerCase().includes('registrera')) {
          trackConversion('signup_click', text);
        } else if (text.toLowerCase().includes('prova plus') || text.toLowerCase().includes('uppgradera')) {
          trackConversion('upgrade_click', text);
        }
      } else if (tag === 'a' && href.startsWith('/blogg/')) {
        eventName = 'blog_link_click';
      } else if (tag === 'a' && (href.startsWith('http') || href.startsWith('//'))) {
        eventName = 'external_link_click';
      } else if (tag === 'a') {
        eventName = 'nav_click';
      }

      supabase.from('click_events').insert({
        event_name: eventName,
        element_id: trackId || null,
        element_text: text || null,
        path: window.location.pathname,
        session_id: getSessionId(),
        metadata: { tag, href: href.slice(0, 200), isCta: ctaMatch },
      } as any).then(() => {});
    };

    document.addEventListener('click', handler, { capture: true, passive: true });
    return () => document.removeEventListener('click', handler, true);
  }, []);
}

/** Track scroll depth on landing page (25%, 50%, 75%, 100%) */
export function useScrollDepthTracking() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== '/') return;

    const thresholds = [25, 50, 75, 100];
    const tracked = new Set<number>();

    const handler = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = Math.round((scrollTop / docHeight) * 100);

      for (const t of thresholds) {
        if (pct >= t && !tracked.has(t)) {
          tracked.add(t);
          supabase.from('click_events').insert({
            event_name: 'scroll_depth',
            element_id: `${t}%`,
            element_text: null,
            path: '/',
            session_id: getSessionId(),
            metadata: { depth: t },
          } as any).then(() => {});

          if (typeof (window as any).gtag === 'function') {
            (window as any).gtag('event', 'scroll_depth', {
              event_category: 'engagement',
              event_label: `${t}%`,
              value: t,
            });
          }
        }
      }
    };

    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [location.pathname]);
}
